'use client';

import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { getAPIKeys, saveAPIKey, toggleAPIKey, deleteAPIKey } from '@/actions/api-keys';

interface APIKeyStats {
  total: number;
  active: number;
  totalUsage: number;
}

interface APIKey {
  id: string;
  name: string;
  provider: string;
  keyMasked: string;
  usageCount: number;
  isActive: boolean;
  lastUsedAt: Date | null;
}

export function APIKeyManager() {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [stats, setStats] = useState<APIKeyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New key form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('gemini');
  const [newKeyValue, setNewKeyValue] = useState('');

  const { toast } = useToast();

  const loadKeys = async () => {
    setIsLoading(true);
    const loadedKeys = await getAPIKeys();
    setKeys(loadedKeys);
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadKeys();
    }
  }, [open]);

  const handleSave = async () => {
    if (!newKeyName || !newKeyValue) {
      toast({
        title: "Hata",
        description: "İsim ve API key gereklidir",
        variant: "destructive"
      });
      return;
    }

    const result = await saveAPIKey(newKeyName, newKeyProvider, newKeyValue);
    
    if (result.success) {
      toast({ title: "Başarılı", description: "API key kaydedildi" });
      setNewKeyName('');
      setNewKeyValue('');
      loadKeys();
    } else {
      toast({
        title: "Hata",
        description: result.error || "Kaydetme başarısız",
        variant: "destructive"
      });
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleAPIKey(id, !currentStatus);
    loadKeys();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu API key\'i silmek istediğinizden emin misiniz?')) return;
    
    await deleteAPIKey(id);
    toast({ title: "Silindi", description: "API key silindi" });
    loadKeys();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Key className="h-4 w-4 mr-2" />
        API Anahtarları
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Anahtar Yönetimi
            </DialogTitle>
            <DialogDescription>
              Birden fazla API key ekleyin. Sistem otomatik olarak döndürür ve limitlere takılmazsınız.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Toplam Key</CardDescription>
                    <CardTitle className="text-2xl">{stats.total}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Aktif</CardDescription>
                    <CardTitle className="text-2xl">{stats.active}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Toplam Kullanım</CardDescription>
                    <CardTitle className="text-2xl">{stats.totalUsage}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Key List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {keys.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Henüz API key eklenmemiş
                </p>
              ) : (
                keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {key.provider} • {key.keyMasked}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{key.usageCount} kullanım</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(key.id, key.isActive)}
                      >
                        {key.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add New Key */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Yeni API Key Ekle
              </h4>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>İsim</Label>
                    <Input
                      placeholder="Örn: Ana Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Sağlayıcı</Label>
                    <select
                      className="w-full h-10 px-3 border rounded-md"
                      value={newKeyProvider}
                      onChange={(e) => setNewKeyProvider(e.target.value)}
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="qwen">Qwen (Alibaba)</option>
                      <option value="glm">GLM (Zhipu)</option>
                      <option value="kimi">Kimi (Moonshot)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="AIzaSy... veya sk-..."
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={loadKeys} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
            <Button onClick={handleSave}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
