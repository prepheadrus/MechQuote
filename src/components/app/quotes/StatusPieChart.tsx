import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Proposal } from '@prisma/client';
import { formatCurrency } from '@/lib/formatters';

interface StatusPieChartProps {
    proposals: Proposal[];
}

const COLORS = {
    Draft: '#94a3b8',   // slate-400
    Sent: '#60a5fa',    // blue-400
    Approved: '#4ade80',// green-400
    Rejected: '#f87171' // red-400
};

const STATUS_LABELS = {
    Draft: 'Hazırlanıyor',
    Sent: 'Gönderildi',
    Approved: 'Onaylandı',
    Rejected: 'Reddedildi'
};

export function StatusPieChart({ proposals }: StatusPieChartProps) {
    const data = React.useMemo(() => {
        const counts = {
            Draft: 0,
            Sent: 0,
            Approved: 0,
            Rejected: 0
        };

        const values = {
            Draft: 0,
            Sent: 0,
            Approved: 0,
            Rejected: 0
        };

        proposals.forEach(p => {
            const status = p.status as keyof typeof counts;
            if (counts[status] !== undefined) {
                counts[status]++;
                values[status] += p.totalAmount || 0;
            }
        });

        return Object.keys(counts).map(key => ({
            name: STATUS_LABELS[key as keyof typeof STATUS_LABELS],
            value: counts[key as keyof typeof counts],
            totalAmount: values[key as keyof typeof values],
            color: COLORS[key as keyof typeof COLORS],
            originalStatus: key
        })).filter(item => item.value > 0);
    }, [proposals]);

    if (data.length === 0) {
        return (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 border rounded-xl bg-white p-4">
                Gösterilecek veri yok
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="bg-white p-2 border rounded shadow-sm text-xs">
                    <p className="font-semibold mb-1">{item.name}</p>
                    <p>Adet: {item.value}</p>
                    <p>Tutar: {formatCurrency(item.totalAmount)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-[200px] w-full bg-white rounded-xl border p-2">
            <h3 className="text-sm font-medium text-slate-700 mb-2 px-2">Durum Dağılımı</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
