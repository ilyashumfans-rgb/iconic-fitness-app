import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus, RefreshCw, Save, Trash2, UserRound } from "lucide-react";
import { AdminCard, AdminLayout } from "@/components/admin/AdminLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { request } from "@/lib/adminApi";

type TrainerOption = { id: string; name: string; gymId: number; branchName: string };
type Certificate = { title: string; url: string };
type TrainerProfile = {
  coverPhotoUrl: string;
  photoUrl: string;
  bio: string;
  qualifications: string[];
  specialties: string[];
  interests: string[];
  certificates: Certificate[];
};
type ProfileForm = Omit<TrainerProfile, "qualifications" | "specialties" | "interests"> & {
  qualificationsText: string;
  specialtiesText: string;
  interestsText: string;
};

const EMPTY: ProfileForm = {
  coverPhotoUrl: "",
  photoUrl: "",
  bio: "",
  qualificationsText: "",
  specialtiesText: "",
  interestsText: "",
  certificates: [],
};
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Unable to complete this request.";
const optionKey = (trainer: TrainerOption) => `${trainer.id}::${trainer.gymId}`;
const lines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
const toForm = (profile: TrainerProfile): ProfileForm => ({
  coverPhotoUrl: profile.coverPhotoUrl ?? "",
  photoUrl: profile.photoUrl ?? "",
  bio: profile.bio ?? "",
  qualificationsText: (profile.qualifications ?? []).join("\n"),
  specialtiesText: (profile.specialties ?? []).join("\n"),
  interestsText: (profile.interests ?? []).join("\n"),
  certificates: profile.certificates ?? [],
});

export default function AdminTrainerProfiles() {
  return <AdminLayout title="Trainer Profiles"><TrainerProfilesContent /></AdminLayout>;
}

function TrainerProfilesContent() {
  const client = useQueryClient();
  const form = useForm<ProfileForm>({ defaultValues: EMPTY });
  const [selectedKey, setSelectedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trainersQuery = useQuery({
    queryKey: ["/api/admin/reviews/trainers", "profile-options"],
    queryFn: ({ signal }) => request<{ trainers: TrainerOption[] }>("/admin/reviews/trainers", { signal }),
    staleTime: 60_000,
    retry: false,
  });
  const trainers = trainersQuery.data?.trainers ?? [];
  const selected = useMemo(() => trainers.find((trainer) => optionKey(trainer) === selectedKey), [selectedKey, trainers]);
  const profileQuery = useQuery({
    queryKey: ["/api/admin/trainers/live/profile", selected?.id, selected?.gymId],
    queryFn: ({ signal }) => request<{ profile: TrainerProfile }>(
      `/admin/trainers/live/${encodeURIComponent(selected!.id)}/profile?gymId=${selected!.gymId}`,
      { signal },
    ),
    enabled: !!selected,
    retry: false,
    staleTime: 0,
  });

  useEffect(() => { document.title = "Trainer Profiles | Iconic Fitness Admin"; }, []);
  useEffect(() => {
    if (!selectedKey && trainers.length > 0) setSelectedKey(optionKey(trainers[0]));
  }, [selectedKey, trainers]);
  useEffect(() => {
    if (profileQuery.data?.profile && selected) {
      form.reset(toForm(profileQuery.data.profile));
      setSaveError(null);
      setSaved(false);
    }
  }, [form, profileQuery.data, selected]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [form.formState.isDirty]);

  const chooseTrainer = (next: string) => {
    if (next === selectedKey) return;
    if (form.formState.isDirty && !window.confirm("Discard unsaved profile changes?")) return;
    form.reset(EMPTY);
    setSelectedKey(next);
    setSaveError(null);
    setSaved(false);
  };
  const refreshProfile = async () => {
    if (form.formState.isDirty && !window.confirm("Discard unsaved changes and reload this profile?")) return;
    setSaveError(null);
    setSaved(false);
    const refreshed = await profileQuery.refetch();
    if (refreshed.data?.profile) form.reset(toForm(refreshed.data.profile));
  };
  const save = async (values: ProfileForm) => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const profile: TrainerProfile = {
      coverPhotoUrl: values.coverPhotoUrl.trim(),
      photoUrl: values.photoUrl.trim(),
      bio: values.bio.trim(),
      qualifications: lines(values.qualificationsText),
      specialties: lines(values.specialtiesText),
      interests: lines(values.interestsText),
      certificates: values.certificates
        .map((certificate) => ({ title: certificate.title.trim(), url: certificate.url.trim() }))
        .filter((certificate) => certificate.title || certificate.url),
    };
    try {
      await request<{ profile: TrainerProfile }>(
        `/admin/trainers/live/${encodeURIComponent(selected.id)}/profile?gymId=${selected.gymId}`,
        { method: "PUT", body: JSON.stringify(profile) },
      );
      await client.invalidateQueries({ queryKey: ["/api/admin/trainers/live/profile", selected.id, selected.gymId] });
      const refreshed = await profileQuery.refetch();
      if (refreshed.data?.profile) form.reset(toForm(refreshed.data.profile));
      setSaved(true);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const certificates = form.watch("certificates");
  const setCertificate = (index: number, patch: Partial<Certificate>) => {
    form.setValue("certificates", certificates.map((certificate, current) => current === index ? { ...certificate, ...patch } : certificate), { shouldDirty: true });
  };

  return <div className="space-y-5">
    <AdminCard className="p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Live trainer profiles</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Select a live trainer and maintain the honest profile details members see. Empty fields stay empty.</p>
        </div>
        <div className="w-full lg:w-[28rem]">
          <Label htmlFor="trainer-profile-select">Trainer and branch</Label>
          <div className="mt-1 flex gap-2">
            <select
              id="trainer-profile-select"
              data-testid="select-trainer-profile"
              value={selectedKey}
              onChange={(event) => chooseTrainer(event.target.value)}
              disabled={trainersQuery.isLoading || saving}
              className="flex h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {trainers.length === 0 && <option value="">No live trainers available</option>}
              {trainers.map((trainer) => <option key={optionKey(trainer)} value={optionKey(trainer)}>{trainer.name} — {trainer.branchName}</option>)}
            </select>
            <Button data-testid="button-refresh-trainer-profile" type="button" size="icon" variant="outline" aria-label="Refresh selected profile" disabled={!selected || saving || profileQuery.isFetching} onClick={() => void refreshProfile()}><RefreshCw className={`h-4 w-4 ${profileQuery.isFetching ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>
      </div>
    </AdminCard>

    {trainersQuery.isLoading ? <AdminCard className="flex items-center justify-center gap-2 p-12" data-testid="status-trainer-options-loading"><Loader2 className="h-5 w-5 animate-spin" />Loading trainers…</AdminCard>
      : trainersQuery.isError ? <AdminCard className="space-y-3 p-8 text-center"><p role="alert" data-testid="error-trainer-options">{errorMessage(trainersQuery.error)}</p><Button data-testid="button-retry-trainers" variant="outline" onClick={() => void trainersQuery.refetch()}>Retry</Button></AdminCard>
      : trainers.length === 0 ? <AdminCard className="p-10 text-center text-muted-foreground" data-testid="text-trainers-empty">No live trainers are available to edit.</AdminCard>
      : profileQuery.isLoading ? <AdminCard className="flex items-center justify-center gap-2 p-12" data-testid="status-trainer-profile-loading"><Loader2 className="h-5 w-5 animate-spin" />Loading profile…</AdminCard>
      : profileQuery.isError ? <AdminCard className="space-y-3 p-8 text-center"><p role="alert" data-testid="error-trainer-profile">{errorMessage(profileQuery.error)}</p><Button data-testid="button-retry-trainer-profile" variant="outline" onClick={() => void profileQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></AdminCard>
      : selected && <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className="space-y-5">
          <AdminCard className="overflow-hidden">
            <div className="relative min-h-44 bg-lime-50">
              {form.watch("coverPhotoUrl") ? <img data-testid="img-trainer-cover" src={form.watch("coverPhotoUrl")} alt="" className="h-52 w-full object-cover" /> : <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">No cover image</div>}
              <div className="absolute bottom-4 left-4 flex gap-2">
                <FileUpload label="Upload cover" accept="image/*" onUploaded={([url]) => form.setValue("coverPhotoUrl", url, { shouldDirty: true })} />
                {form.watch("coverPhotoUrl") && <Button data-testid="button-clear-trainer-cover" type="button" size="sm" variant="secondary" onClick={() => form.setValue("coverPhotoUrl", "", { shouldDirty: true })}>Clear</Button>}
              </div>
            </div>
            <div className="grid gap-6 p-5 md:grid-cols-[180px_1fr]">
              <div>
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border bg-slate-50">
                  {form.watch("photoUrl") ? <img data-testid="img-trainer-portrait" src={form.watch("photoUrl")} alt={`${selected.name} portrait`} className="h-full w-full object-cover" /> : <UserRound className="h-12 w-12 text-slate-300" />}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <FileUpload label="Upload portrait" accept="image/*" onUploaded={([url]) => form.setValue("photoUrl", url, { shouldDirty: true })} />
                  {form.watch("photoUrl") && <Button data-testid="button-clear-trainer-portrait" type="button" size="sm" variant="outline" onClick={() => form.setValue("photoUrl", "", { shouldDirty: true })}>Clear</Button>}
                </div>
              </div>
              <div>
                <h3 data-testid="text-selected-trainer" className="text-xl font-semibold">{selected.name}</h3>
                <p className="text-sm text-muted-foreground">{selected.branchName}</p>
                <Label htmlFor="trainer-bio" className="mt-5 block">Biography</Label>
                <Textarea id="trainer-bio" data-testid="input-trainer-bio" rows={7} maxLength={4000} placeholder="No biography added yet." {...form.register("bio")} />
              </div>
            </div>
          </AdminCard>

          <div className="grid gap-5 lg:grid-cols-3">
            {([
              ["qualificationsText", "Qualifications", "One qualification per line"],
              ["specialtiesText", "Specialties", "One specialty per line"],
              ["interestsText", "Interests", "One interest per line"],
            ] as const).map(([name, label, placeholder]) => <AdminCard key={name} className="p-5"><Label htmlFor={name}>{label}</Label><Textarea id={name} data-testid={`input-trainer-${name}`} rows={8} placeholder={placeholder} {...form.register(name)} /><p className="mt-2 text-xs text-muted-foreground">Enter one item per line. Blank lines are ignored.</p></AdminCard>)}
          </div>

          <AdminCard className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div><h3 className="font-semibold">Certificates</h3><p className="text-sm text-muted-foreground">Add a title and upload a PDF or image, or paste its URL.</p></div>
              <Button data-testid="button-add-certificate" type="button" variant="outline" onClick={() => form.setValue("certificates", [...certificates, { title: "", url: "" }], { shouldDirty: true })}><Plus className="mr-2 h-4 w-4" />Add</Button>
            </div>
            {certificates.length === 0 ? <p data-testid="text-certificates-empty" className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No certificates added.</p>
              : <div className="mt-5 space-y-4">{certificates.map((certificate, index) => <div key={index} className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
                <div><Label htmlFor={`certificate-title-${index}`}>Title</Label><Input id={`certificate-title-${index}`} data-testid={`input-certificate-title-${index}`} value={certificate.title} onChange={(event) => setCertificate(index, { title: event.target.value })} /></div>
                <div><Label htmlFor={`certificate-url-${index}`}>Document URL</Label><Input id={`certificate-url-${index}`} data-testid={`input-certificate-url-${index}`} value={certificate.url} onChange={(event) => setCertificate(index, { url: event.target.value })} /><div className="mt-2 flex items-center gap-2"><FileUpload label="Upload PDF / image" accept="application/pdf,image/*" onUploaded={([url]) => setCertificate(index, { url })} />{certificate.url && <a data-testid={`link-certificate-${index}`} href={certificate.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-lime-700 hover:underline"><FileText className="h-3.5 w-3.5" />Open</a>}</div></div>
                <Button data-testid={`button-remove-certificate-${index}`} type="button" variant="ghost" size="icon" aria-label={`Remove certificate ${index + 1}`} onClick={() => form.setValue("certificates", certificates.filter((_, current) => current !== index), { shouldDirty: true })}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>)}</div>}
          </AdminCard>

          {(saveError || saved) && <p role={saveError ? "alert" : "status"} data-testid={saveError ? "error-trainer-profile-save" : "status-trainer-profile-saved"} className={`text-sm ${saveError ? "text-red-600" : "text-lime-700"}`}>{saveError ?? "Profile saved and refreshed."}</p>}
          <div className="sticky bottom-4 flex justify-end">
            <Button data-testid="button-save-trainer-profile" type="submit" disabled={saving || !form.formState.isDirty} className="shadow-lg">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? "Saving…" : "Save profile"}</Button>
          </div>
        </form>
      </Form>}
  </div>;
}