import crossOriginIsolation from 'vite-plugin-cross-origin-isolation'

export default { 
    plugins: [
        crossOriginIsolation(),
    ],
    base: '/ts-concurrent-particle-sim'
}
