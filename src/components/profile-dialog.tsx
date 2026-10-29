import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useData } from '@/lib/data';

export const DEFAULT_SCHOOL = 'Autoškola Lišák';

export const initials = (name?: string) =>
  (name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/**
 * Jméno a autoškola. Při prvním spuštění se otevře sama a nejde zavřít, dokud jméno nevyplníš.
 * Později se otevře kliknutím na své jméno v postranním panelu.
 */
export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profile, saveProfile } = useData();
  const firstRun = !profile.name;
  const [name, setName] = useState(profile.name ?? '');
  const [school, setSchool] = useState(profile.school ?? DEFAULT_SCHOOL);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(profile.name ?? '');
      setSchool(profile.school ?? DEFAULT_SCHOOL);
    }
  }, [open, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await saveProfile({ name, school });
    setSaving(false);
    onOpenChange(false);
    toast.success(firstRun ? `Vítej, ${name.trim().split(/\s+/)[0]}!` : 'Uloženo');
  };

  return (
    <Dialog open={open || firstRun} onOpenChange={(o) => !firstRun && onOpenChange(o)}>
      <DialogContent showCloseButton={!firstRun} onEscapeKeyDown={(e) => firstRun && e.preventDefault()} onInteractOutside={(e) => firstRun && e.preventDefault()}>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{firstRun ? 'Vítej v Autoškole' : 'Tvůj profil'}</DialogTitle>
            <DialogDescription>
              {firstRun
                ? 'Jak se jmenuješ? Všechny výsledky se ukládají jen u tebe v počítači.'
                : 'Jméno a autoškola se zobrazují v postranním panelu.'}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="profile-name">Jméno</FieldLabel>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Novák" autoComplete="name" autoFocus required maxLength={80} />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-school">Autoškola</FieldLabel>
              <Input id="profile-school" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={80} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || saving}>{firstRun ? 'Začít' : 'Uložit'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
