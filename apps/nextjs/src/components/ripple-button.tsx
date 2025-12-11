"use client";

import { Button } from "@acme/ui/button";

export const RippleButton = () => {
    const triggerRipple = () => {
        // Dispatch custom event that the DotShader will listen to
        window.dispatchEvent(new CustomEvent('trigger-ripple'));
    };

    return (
        <Button onClick={triggerRipple} variant="outline" size="sm">
            Ripple
        </Button>
    );
};
