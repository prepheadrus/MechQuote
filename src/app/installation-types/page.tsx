import { Metadata } from 'next';
import { Suspense } from 'react';
import { InstallationTypesPageContent, TreeNode } from '@/app/installation-types/installation-types-client-page';
import { getInstallationTypes } from '@/actions/installation-types';
import { InstallationType } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Tesisat Kategorileri',
};

const buildTree = (categories: InstallationType[]): TreeNode[] => {
  const categoryMap: { [id: string]: TreeNode } = {};
  const roots: TreeNode[] = [];

  if (!categories) return roots;

  categories.forEach(category => {
    categoryMap[category.id] = { ...category, children: [] };
  });

  categories.forEach(category => {
    if (category.parentId && categoryMap[category.parentId]) {
      if (category.id !== category.parentId) {
        categoryMap[category.parentId].children.push(categoryMap[category.id]);
      }
    } else {
      roots.push(categoryMap[category.id]);
    }
  });

  Object.values(categoryMap).forEach(node => {
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));
  });
  roots.sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));

  return roots;
};

async function InstallationTypesData({ searchTerm }: { searchTerm: string }) {
  const { data: categories, success } = await getInstallationTypes();

  if (!success || !categories) {
    return <p className='p-8 text-red-500'>Kategoriler yüklenirken bir hata oluştu.</p>;
  }

  const fullTree = buildTree(categories);

  const getFilteredTree = () => {
    if (!searchTerm.trim()) return fullTree;

    const term = searchTerm.toLocaleLowerCase('tr-TR');
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matchesSelf = node.name.toLocaleLowerCase('tr-TR').includes(term) ||
          (node.description || '').toLocaleLowerCase('tr-TR').includes(term);
        const filteredChildren = filterNodes(node.children);

        if (matchesSelf || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, []);
    };
    return filterNodes(fullTree);
  };

  const categoryTree = getFilteredTree();

  return <InstallationTypesPageContent allCategories={categories} categoryTree={categoryTree} searchTerm={searchTerm} />;
}


interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function InstallationTypesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const searchTerm = resolvedSearchParams?.q || '';

  return (
    <Suspense fallback={<div className="p-8"><Skeleton className="w-full h-64" /></div>}>
      <InstallationTypesData searchTerm={searchTerm} />
    </Suspense>
  );
}
