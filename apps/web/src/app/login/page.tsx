"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleLogo, GithubLogo, GoogleLogo } from "@phosphor-icons/react";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 font-sans">
            <Link href="/" className="mb-8 font-serif text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                ASPENDOS
            </Link>

            <Card className="w-full max-w-md shadow-xl border-zinc-200 dark:border-zinc-800 p-2">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-serif">Welcome back</CardTitle>
                    <CardDescription>
                        Enter your email to sign in to your OS
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" className="w-full">
                            <GoogleLogo weight="bold" className="mr-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="w-full">
                            <GithubLogo weight="bold" className="mr-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="w-full">
                            <AppleLogo weight="bold" className="mr-2 h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-zinc-950 px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="m@example.com" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" />
                        <Link
                            href="/forgot-password"
                            className="text-xs text-right text-muted-foreground hover:text-primary transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full">Sign In</Button>
                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/signup" className="underline underline-offset-4 hover:text-primary">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
