import React from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { SiGoogle } from "react-icons/si";
import axios from "axios";  // Import axios for HTTP requests

const GoogleSignIn = () => {
    const handleSuccess = async (response: any) => {

        try {
            const token = response.credential;
            const res = await axios.post("/api/auth/google", {
                token: token,
            });
            setTimeout(() => {
                window.location.href = '/'
            }, 1000)
        } catch (error) {
            console.error("Error while sending token to backend:", error);
        }
    };


    const handleError = (error: any) => {
        console.error("Google Login Error:", error);
    };

    return (
        <GoogleOAuthProvider clientId="557005901423-93qf2ouvnhrjp82cm0us9fjmij0ek05v.apps.googleusercontent.com">
            <div className="flex justify-center items-center ">
                <div className="text-center">
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        // @ts-ignore
                        onError={handleError}
                        useOneTap
                        theme="filled_blue"
                        shape="pill"
                        width="300"
                        className="py-2 px-4 rounded-full flex justify-center items-center border border-gray-300 hover:bg-gray-100"
                    >
                        <SiGoogle className="mr-2 h-5 w-5" />
                        Sign in with Google
                    </GoogleLogin>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default GoogleSignIn;
