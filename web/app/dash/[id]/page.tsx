import DashboardCanvas from '../../canvas/DashboardCanvas'
import { fetchDashboard } from '../../canvas/components/api'

export default async function Page({ params }: { params: { id: string } }) {
  const { schema, name } = await fetchDashboard(params.id)
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <DashboardCanvas schema={schema} />
    </main>
  )
}
