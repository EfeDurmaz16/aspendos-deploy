declare module 'openmemory-js' {
    export class Memory {
        constructor(...args: any[]);
        search(...args: any[]): Promise<any[]>;
        add(...args: any[]): Promise<any>;
        reinforce(...args: any[]): Promise<any>;
        getStats(...args: any[]): Promise<any>;
    }
}

declare module 'openmemory-js/dist/core/db' {
    export const q: any;
}
