import { getProposals } from './src/actions/proposals/proposals';

async function main() {
    const res = await getProposals({});
    console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
