import { type Colors, type Timing } from "./core.js";
export type LogoIntroOptions = {
    label?: string;
    colors?: Partial<Colors>;
    timing?: Partial<Timing>;
    fontFamily?: string;
    fontSize?: string;
    fontTimeout?: number;
    skippable?: boolean;
    reducedMotion?: boolean;
    onFinish?: () => void;
};
export type LogoIntro = {
    finished: Promise<void>;
    skip: () => void;
};
export declare function playLogoIntro(container: HTMLElement, options?: LogoIntroOptions): LogoIntro;
