import { KnowledgeForm } from '@/components/knowledge/knowledge-form';

export default function NewKnowledgePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Create New Knowledge Item</h1>
      <KnowledgeForm />
    </div>
  );
}
