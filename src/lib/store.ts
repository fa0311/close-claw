export const createStore = <T>() => {
    let value: T | undefined;

    return {
        with: <R>(callback: (value: T) => R) => {
            if (value) return callback(value);
            return undefined;
        },
        set: (next: T | undefined) => {
            value = next;
        },
    };
};
