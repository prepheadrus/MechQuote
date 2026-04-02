/**
 * Project Team Component
 * 
 * Proje ekip yönetimi ve atamalar
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus } from 'lucide-react';

interface TeamMember {
    id: string;
    personnelId: string;
    personnel: {
        name: string;
        role?: string;
        phone?: string;
        email?: string;
    };
    assignedAmount: number;
    paymentStatus: string;
}

interface ProjectTeamProps {
    team: TeamMember[];
    onAddMember: () => void;
}

export function ProjectTeam({ team, onAddMember }: ProjectTeamProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(amount);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <CardTitle>Proje Ekibi</CardTitle>
                            <CardDescription>
                                {team.length} kişi görevlendirildi
                            </CardDescription>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={onAddMember} className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Ekle
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {team.length > 0 ? (
                    <div className="space-y-4">
                        {team.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{member.personnel.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {member.personnel.role || 'Personel'}
                                            {member.personnel.phone && ` • ${member.personnel.phone}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium">
                                        {formatCurrency(member.assignedAmount)}
                                    </div>
                                    <Badge
                                        variant={
                                            member.paymentStatus === 'Ödendi'
                                                ? 'default'
                                                : member.paymentStatus === 'Kısmi Ödendi'
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                    >
                                        {member.paymentStatus}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Henüz ekip üyesi atanmamış</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
