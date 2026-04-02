'use client';

import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Search, Loader2, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getAllProjects } from '@/actions/projects';
import { formatDate } from '@/lib/formatters';

interface GlobalProjectSelectorProps {
    value?: string;
    onSelect: (projectId: string, customerId?: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

export function GlobalProjectSelector({
    value,
    onSelect,
    disabled,
    placeholder = "Proje Ara...",
    className
}: GlobalProjectSelectorProps) {
    const [open, setOpen] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        const loadProjects = async () => {
            setLoading(true);
            try {
                const result = await getAllProjects();
                if (result.success && result.data) {
                    setProjects(result.data);
                }
            } catch (error) {
                console.error("Failed to load all projects", error);
            } finally {
                setLoading(false);
            }
        };

        if (open && projects.length === 0) {
            loadProjects();
        }
    }, [open, projects.length]);

    const selectedProject = projects.find((p) => p.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn("w-full justify-between h-auto py-2 px-3 items-start text-left font-normal", className)}
                >
                    {selectedProject ? (
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="font-semibold truncate">{selectedProject.name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <User className="h-2.5 w-2.5" />
                                    {selectedProject.customer?.name || "Bilinmeyen Müşteri"}
                                </span>
                                {selectedProject.proposals?.[0]?.createdAt && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-2.5 w-2.5" />
                                        {formatDate(selectedProject.proposals[0].createdAt)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 self-center" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Proje veya müşteri adı ile ara..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                    />
                    <CommandList>
                        {loading && (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                                <span className="text-sm text-muted-foreground">Yükleniyor...</span>
                            </div>
                        )}
                        {!loading && projects.length === 0 && <CommandEmpty>Proje bulunamadı.</CommandEmpty>}
                        <CommandGroup>
                            <CommandItem
                                value="no-project"
                                onSelect={() => {
                                    onSelect("", "");
                                    setOpen(false);
                                }}
                                className="italic text-muted-foreground py-2"
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        !value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                -- Proje Yok (Genel) --
                            </CommandItem>
                            {projects
                                .filter(p =>
                                    p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                                    p.customer?.name.toLowerCase().includes(searchValue.toLowerCase())
                                )
                                .slice(0, 100) // Limit displayed items
                                .map((project) => (
                                    <CommandItem
                                        key={project.id}
                                        value={project.id}
                                        onSelect={() => {
                                            onSelect(project.id, project.customerId);
                                            setOpen(false);
                                        }}
                                        className="flex flex-col items-start gap-1 py-2"
                                    >
                                        <div className="flex items-center w-full">
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0",
                                                    value === project.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="font-medium text-sm">{project.name}</span>
                                        </div>
                                        <div className="pl-6 flex items-center gap-3 text-[11px] text-muted-foreground w-full">
                                            <span className="flex items-center gap-1 truncate max-w-[150px]">
                                                <User className="h-3 w-3" />
                                                {project.customer?.name}
                                            </span>
                                            {project.proposals?.[0]?.createdAt && (
                                                <span className="flex items-center gap-1 shrink-0">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(project.proposals[0].createdAt)}
                                                </span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
