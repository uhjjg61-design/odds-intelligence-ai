import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ComposedChart, Tooltip, XAxis, YAxis, Legend, Cell } from "recharts";
import { backtest, calibration, oddsMovement, signalDistribution } from "@/lib/demo-data";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "var(--foreground)" } };
const Wrap = ({ children, h = 240 }: { children: React.ReactElement; h?: number }) => (
  <div dir="ltr" style={{ height: h }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
);

export function OddsMovementChart({ labels }: { labels: { home: string; draw: string; away: string } }) {
  return (
    <Wrap><LineChart data={oddsMovement}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis dataKey="t" {...axis} interval={3} /><YAxis {...axis} domain={["auto", "auto"]} width={40} />
      <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
      <Line dataKey="home" name={labels.home} stroke="var(--chart-1)" dot={false} strokeWidth={2} />
      <Line dataKey="draw" name={labels.draw} stroke="var(--chart-5)" dot={false} strokeWidth={1.5} />
      <Line dataKey="away" name={labels.away} stroke="var(--chart-2)" dot={false} strokeWidth={2} />
    </LineChart></Wrap>
  );
}

export function CalibrationChart({ labels }: { labels: { predicted: string; observed: string } }) {
  return (
    <Wrap><ComposedChart data={calibration}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis dataKey="predicted" {...axis} type="number" domain={[0, 1]} /><YAxis {...axis} domain={[0, 1]} width={40} />
      <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
      <Line dataKey="predicted" name={labels.predicted} stroke="var(--chart-5)" strokeDasharray="4 4" dot={false} />
      <Scatter dataKey="observed" name={labels.observed} fill="var(--chart-1)" />
    </ComposedChart></Wrap>
  );
}

export function BacktestChart({ data = backtest, label }: { data?: typeof backtest; label: string }) {
  return (
    <Wrap><AreaChart data={data}>
      <defs><linearGradient id="bt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis dataKey="week" {...axis} interval={Math.max(0, Math.floor(data.length / 8))} /><YAxis {...axis} domain={["auto", "auto"]} width={40} />
      <Tooltip {...tip} />
      <Area dataKey="bankroll" name={label} stroke="var(--chart-1)" fill="url(#bt)" strokeWidth={2} />
    </AreaChart></Wrap>
  );
}

export function DrawdownChart({ data = backtest, label }: { data?: typeof backtest; label: string }) {
  return (
    <Wrap h={180}><AreaChart data={data}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis dataKey="week" {...axis} interval={Math.max(0, Math.floor(data.length / 8))} /><YAxis {...axis} width={40} unit="%" />
      <Tooltip {...tip} />
      <Area dataKey="drawdown" name={label} stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.2} />
    </AreaChart></Wrap>
  );
}

export function SignalDistributionChart({ label }: { label: string }) {
  return (
    <Wrap><BarChart data={signalDistribution}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="range" {...axis} /><YAxis {...axis} width={40} />
      <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
      <Bar dataKey="count" name={label} radius={[4, 4, 0, 0]}>
        {signalDistribution.map((d, i) => <Cell key={d.range} fill={i >= 3 ? "var(--chart-1)" : "var(--chart-5)"} />)}
      </Bar>
    </BarChart></Wrap>
  );
}