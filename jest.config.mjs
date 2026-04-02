import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
    // Next.js uygulaması için test ortamını hazırlar
    dir: './',
})

/** @type {import('jest').Config} */
const config = {
    // Testlerin koşacağı ortam
    testEnvironment: 'jest-environment-node',
    // Setup dosyası gerekiyorsa buraya eklenir
    // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
}

export default createJestConfig(config)
