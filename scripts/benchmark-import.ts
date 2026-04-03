import { prisma } from '@/lib/prisma';
import { importProductsFromExcel } from '@/actions/products';
import { Product } from '@prisma/client';

async function runBenchmark() {
    console.log('--- Starting importProductsFromExcel Benchmark ---');

    // Create mock data (e.g., 2000 products)
    const productCount = 2000;
    const mockProducts: Partial<Product>[] = [];

    for (let i = 0; i < productCount; i++) {
        mockProducts.push({
            code: `TEST-CODE-${i}`,
            name: `Test Product ${i}`,
            listPrice: Math.random() * 1000,
            currency: 'TRY',
            vatRate: 0.20,
        });
    }

    // Clean up before test
    await prisma.product.deleteMany({
        where: {
            code: {
                startsWith: 'TEST-CODE-'
            }
        }
    });

    console.log(`Testing with ${productCount} products...`);

    // Measure time
    const startTime = performance.now();
    await importProductsFromExcel(mockProducts);
    const endTime = performance.now();

    const durationMs = endTime - startTime;
    console.log(`Execution Time: ${durationMs.toFixed(2)} ms`);
    console.log(`Average Time per Product: ${(durationMs / productCount).toFixed(2)} ms`);

    // Clean up after test
    await prisma.product.deleteMany({
        where: {
            code: {
                startsWith: 'TEST-CODE-'
            }
        }
    });

    console.log('--- Benchmark Complete ---');
}

runBenchmark().catch(console.error);
