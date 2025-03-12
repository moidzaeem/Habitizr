import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Logo from "@/components/ui/logo";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Apple, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { SiFacebook, SiGithub, SiInstagram, SiLinkedin } from "react-icons/si";

import { TermsDialog, PrivacyDialog, CookieDialog } from "@/components/policy-dialogs";
import { ContactDialog } from "@/components/policy-dialogs"; // Import the ContactDialog component


const Optin = () => {

    return (
        <div className="min-h-screen gradient-bg">
            <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-200 bg-background/80 backdrop-blur-sm shadow-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/">
                        <Logo />
                    </Link>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            className="gap-2 font-medium text-lg px-6 py-6"
                            onClick={() => {
                                toast({
                                    title: "Coming Soon!",
                                    description: "The iOS app is currently in development.",
                                })
                            }}
                        >
                            <Apple className="h-8 w-8" />
                            App Store
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 font-medium text-lg px-6 py-6"
                            onClick={() => {
                                toast({
                                    title: "Coming Soon!",
                                    description: "The Android app is currently in development.",
                                })
                            }}
                        >
                            <Play className="h-8 w-8" />
                            Play Store
                        </Button>
                        <Link href="/auth">
                            <Button variant="outline" className="font-medium text-lg px-6 py-6">Login</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-16">
                {/* Hero Section */}
                <section className="container mx-auto px-6 py-16 md:py-24">
                <h3 className="text-3xl font-bold text-center mb-16 tracking-tight">Opt-in Flow</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 items-center">
                        <img
                            src="/attached_assets/1.jpeg"
                            alt="People doing yoga in a bright, colorful setting"
                            className="w-full h-auto object-cover"
                        />
                        <img
                            src="/attached_assets/2.jpeg"
                            alt="People doing yoga in a bright, colorful setting"
                            className="w-full h-auto object-cover"
                        />
                        <img
                            src="/attached_assets/3.jpeg"
                            alt="People doing yoga in a bright, colorful setting"
                            className="w-full h-auto object-cover"
                        />
                        <img
                            src="/attached_assets/4.jpeg"
                            alt="People doing yoga in a bright, colorful setting"
                            className="w-full h-auto object-cover"
                        />
                        <img
                            src="/attached_assets/5.jpeg"
                            alt="People doing yoga in a bright, colorful setting"
                            className="w-full h-auto object-cover"
                        />
                        <img
                            src="/attached_assets/7.jpeg"
                            alt="People doing yoga in a bright, colorful setting"
                            className="w-full h-auto object-cover"
                        />
                         <img
                            src="/attached_assets/8.jpeg"
                            alt="People doing yoga in a bright, colorful setting"
                            className="w-full h-auto object-cover"
                        />
                    </div>
                </section>

            {/* Footer */}
            <footer className="mt-24 bg-background border-t">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-base text-gray-700 dark:text-gray-300 font-medium leading-relaxed tracking-normal">
                            &copy; {new Date().getFullYear()} Habitizr. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <PrivacyDialog trigger={
                                <span className="text-base text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary font-medium leading-relaxed tracking-normal cursor-pointer">
                                    Privacy Policy
                                </span>
                            } />
                            <TermsDialog trigger={
                                <span className="text-base text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary font-medium leading-relaxed tracking-normal cursor-pointer">
                                    Terms of Service
                                </span>
                            } />
                            <CookieDialog trigger={
                                <span className="text-base text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary font-medium leading-relaxed tracking-normal cursor-pointer">
                                    Cookie Policy
                                </span>
                            } />
                            <ContactDialog trigger={
                                <span className="text-base text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary font-medium cursor-pointer">
                                    Contact
                                </span>
                            } />
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    className="gap-2 hover:bg-primary/5 font-medium text-lg px-6 py-6"
                                    onClick={() => {
                                        toast({
                                            title: "Coming Soon!",
                                            description: "The iOS app is currently in development.",
                                        })
                                    }}
                                >
                                    <Apple className="h-8 w-8" />
                                    App Store
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2 hover:bg-primary/5 font-medium text-lg px-6 py-6"
                                    onClick={() => {
                                        toast({
                                            title: "Coming Soon!",
                                            description: "The Android app is currently in development.",
                                        })
                                    }}
                                >
                                    <Play className="h-8 w-8" />
                                    Play Store
                                </Button>
                            </div>

                            <div className="flex items-center gap-6">
                                <a href="#" className="text-gray-600 hover:text-primary transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary">
                                    <SiFacebook className="h-6 w-6" />
                                </a>
                                <a href="#" className="text-gray-600 hover:text-primary transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary">
                                    <SiGithub className="h-6 w-6" />
                                </a>
                                <a href="#" className="text-gray-600 hover:text-primary transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary">
                                    <SiInstagram className="h-6 w-6" />
                                </a>
                                <a href="#" className="text-gray-600 hover:text-primary transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary">
                                    <SiLinkedin className="h-6 w-6" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
        </div >
    );
};

export default Optin;