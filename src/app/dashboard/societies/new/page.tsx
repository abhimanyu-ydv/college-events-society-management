import { redirect } from "next/navigation";
import { createSocietyApplication } from "@/actions/societies";

async function submit(formData: FormData) {
  "use server";
  const society = await createSocietyApplication(formData);
  redirect(`/dashboard/societies/${society.slug}`);
}

const CATEGORIES = ["technical", "cultural", "sports", "literary", "departmental"] as const;

export default function NewSocietyPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Apply to start a society</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Your application will be reviewed by the university administration.
        </p>
      </div>

      <form action={submit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Society name
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={3}
            maxLength={100}
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium">
            Department <span className="text-foreground/50">(optional)</span>
          </label>
          <input
            id="department"
            name="department"
            maxLength={100}
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={2000}
            rows={5}
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
        >
          Submit application
        </button>
      </form>
    </div>
  );
}
