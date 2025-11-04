export type RGLItem = { x: number; y: number; w: number; h: number; i: string };
export type VizSchema = {
  id: string;
  title: string;
  datasetKey: string;
  chart: { type: 'area'|'bar'|'stacked_bar'|'line'|'kpi'|'table'; x?: string; y?: string[] };
  query: any;
};
export type DashboardSchema = {
  layout: RGLItem[];
  widgets: VizSchema[];
};
