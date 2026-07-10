interface Props {
  data: {
    category: string;
    views: number;
  }[];
}

export default function CategoryLeaderboard({ data }: Props) {
  const max = Math.max(...data.map((x) => x.views), 1);

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = (item.views / max) * 100;

        return (
          <div key={item.category}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {index === 0 && <span className="text-lg">🏆</span>}

                <span className="font-medium text-slate-700">
                  {item.category}
                </span>
              </div>

              <span className="text-sm font-semibold text-slate-500">
                {item.views}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-500 to-pink-400 transition-all duration-700"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
