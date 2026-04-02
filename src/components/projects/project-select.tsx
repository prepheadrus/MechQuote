import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { getProjectsForSelect } from '@/actions/projects';

interface ProjectSelectProps {
    customerId?: string;
    value?: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    fallbackName?: string;
}

type ProjectSelectItem = {
    id: string;
    name: string;
    customerName: string;
};

export function ProjectSelect({ customerId, value, onChange, disabled, placeholder = "Proje Seçiniz (Opsiyonel)", fallbackName }: ProjectSelectProps) {
    const [projects, setProjects] = useState<ProjectSelectItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            const result = await getProjectsForSelect(customerId);
            if (result.success && result.data) {
                setProjects(result.data);
            }
            setLoading(false);
        };
        fetchProjects();
    }, [customerId]);

    const selectedProjectName = value && value !== "no-project"
        ? (projects.find(p => p.id === value)?.name || fallbackName)
        : null;

    return (
        <Select value={value || "no-project"} onValueChange={(val) => onChange(val === "no-project" ? "" : val)} disabled={disabled || loading}>
            <SelectTrigger className="w-full h-8 text-xs">
                <div className="flex items-center gap-2 max-w-full overflow-hidden">
                    {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
                    <span className="truncate block text-left">
                        {selectedProjectName || <span className="text-muted-foreground">{placeholder}</span>}
                    </span>
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="no-project" className="text-muted-foreground italic">
                    -- Proje Yok (Genel) --
                </SelectItem>
                {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                        {project.name}
                        {!customerId && project.customerName && (
                            <span className="text-xs text-muted-foreground ml-2">({project.customerName})</span>
                        )}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
