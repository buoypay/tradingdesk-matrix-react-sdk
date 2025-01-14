/*
Copyright 2016 OpenMarket Ltd
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InteractiveAuthDialog from "../../../../src/components/views/dialogs/InteractiveAuthDialog";
import { flushPromises, getMockClientWithEventEmitter, unmockClientPeg } from "../../../test-utils";

describe("InteractiveAuthDialog", function () {
    const mockClient = getMockClientWithEventEmitter({
        generateClientSecret: jest.fn().mockReturnValue("t35tcl1Ent5ECr3T"),
    });

    const defaultProps = {
        matrixClient: mockClient,
        makeRequest: jest.fn().mockResolvedValue(undefined),
        onFinished: jest.fn(),
    };

    const renderComponent = (props = {}) => render(<InteractiveAuthDialog {...defaultProps} {...props} />);
    const getPasswordField = () => screen.getByLabelText("Password");
    const getSubmitButton = () => screen.getByRole("button", { name: "Continue" });

    beforeEach(function () {
        jest.clearAllMocks();
        mockClient.credentials = { userId: null };
    });

    afterAll(() => {
        unmockClientPeg();
    });

    it("Should successfully complete a password flow", async () => {
        const onFinished = jest.fn();
        const makeRequest = jest.fn().mockResolvedValue({ a: 1 });

        mockClient.credentials = { userId: "@user:id" };
        const authData = {
            session: "sess",
            flows: [{ stages: ["m.login.password"] }],
        };

        renderComponent({ makeRequest, onFinished, authData });

        const passwordField = getPasswordField();
        const submitButton = getSubmitButton();

        expect(passwordField).toBeTruthy();
        expect(submitButton).toBeTruthy();

        // submit should be disabled
        expect(submitButton).toBeDisabled();

        // put something in the password box
        await userEvent.type(passwordField, "s3kr3t");

        expect(submitButton).not.toBeDisabled();

        // hit enter; that should trigger a request
        await userEvent.click(submitButton);

        // wait for auth request to resolve
        await flushPromises();

        expect(makeRequest).toHaveBeenCalledTimes(1);
        expect(makeRequest).toBeCalledWith(
            expect.objectContaining({
                session: "sess",
                type: "m.login.password",
                password: "s3kr3t",
                identifier: {
                    type: "m.id.user",
                    user: "@user:id",
                },
            }),
        );

        expect(onFinished).toBeCalledTimes(1);
        expect(onFinished).toBeCalledWith(true, { a: 1 });
    });
});
