module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            'uniwind/babel',
            'react-native-reanimated/plugin',
        ],
    };
};
