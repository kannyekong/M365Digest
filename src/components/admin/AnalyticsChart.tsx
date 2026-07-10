import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Props {
  data: {
    category: string;
    views: number;
  }[];
}

export default function AnalyticsChart({ data }: Props) {
  return (
    <div className="h-70 w-full">
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            top: 0,
            right: 10,
            left: 10,
            bottom: 0,
          }}
          barCategoryGap="45%"
        >
          <XAxis type="number" hide/>

          <YAxis type="category" dataKey="category" width={130} />

          <Tooltip />

          <Bar
            dataKey="views"
            fill="#dc2626"
            radius={[5, 5, 5, 5]}
            barSize={12}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
