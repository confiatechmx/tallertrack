const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/app/(dashboard)/configuracion/page.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update imports
if (!code.includes('Upload,')) {
  const marker = 'import CustomDomainModal from "@/components/hq/CustomDomainModal";';
  const importTarget = '  Check,\n  Globe,\n} from "lucide-react";';
  const importReplacement = '  Check,\n  Globe,\n  Upload,\n  Trash2,\n  ImageIcon,\n} from "lucide-react";\nimport { toast } from "sonner";';

  code = code.replace(importTarget, importReplacement);
  console.log('Imports updated!');
}

// 2. Add state & handler
const stateTarget = 'const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);';
const stateAddition = `const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen supera el límite de 5 MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = \`logos/\${tenantEmpresa?.id || "empresa"}_\${Date.now()}.\${ext}\`;
      const { error: uploadError } = await supabase.storage
        .from("branding-taller")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("branding-taller")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setFormEmpresa((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
        toast.success("Logotipo cargado correctamente.");
      }
    } catch (err: any) {
      console.error("Error subiendo logo:", err);
      toast.error("Error al subir imagen: " + (err.message || ""));
    } finally {
      setUploadingLogo(false);
    }
  };`;

if (!code.includes('uploadingLogo')) {
  code = code.replace(stateTarget, stateAddition);
  console.log('State & handler added!');
}

// 3. Replace the logo field with the rich uploader
const targetOldLogoStart = '<label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">\n                    URL del Logotipo (Opcional)\n                  </label>';
const newLogoSection = `<div className="flex flex-col gap-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    Logotipo Institucional de la Marca
                  </label>

                  {/* Logo Preview & Upload Controls */}
                  <div className="flex items-center gap-3">
                    {formEmpresa.logo_url ? (
                      <div className="relative group w-14 h-14 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                        <img
                          src={formEmpresa.logo_url}
                          alt="Logo del Taller"
                          className="w-full h-full object-contain rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setFormEmpresa((prev) => ({ ...prev, logo_url: "" }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs cursor-pointer"
                          title="Eliminar logo"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon size={20} />
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer shadow-xs transition-colors">
                          <Upload size={13} className={uploadingLogo ? "animate-bounce text-primary" : "text-slate-500"} />
                          <span>{uploadingLogo ? "Subiendo..." : "Subir Archivo de Imagen"}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                            className="hidden"
                          />
                        </label>
                        {formEmpresa.logo_url && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={11} /> Activo
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-400">
                        Formatos soportados: PNG, JPG, WebP o SVG (máx. 5 MB).
                      </p>
                    </div>
                  </div>

                  {/* Fallback URL Input */}
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 block mb-1">O escribe directamente la URL pública:</span>
                    <input
                      type="text"
                      value={formEmpresa.logo_url}
                      onChange={(e) =>
                        setFormEmpresa({
                          ...formEmpresa,
                          logo_url: e.target.value,
                        })
                      }
                      placeholder="https://ejemplo.com/logo-taller.png"
                      className={inputClasses}
                    />
                  </div>
                </div>`;

const idxLogo = code.indexOf('URL del Logotipo (Opcional)');
if (idxLogo !== -1) {
  // Find opening <div> before it
  const openDiv = code.lastIndexOf('<div>', idxLogo);
  // Find closing </div> after the input
  const closeDiv = code.indexOf('</div>', idxLogo);
  if (openDiv !== -1 && closeDiv !== -1) {
    code = code.substring(0, openDiv) + newLogoSection + code.substring(closeDiv + 6);
    console.log('Logo uploader UI replaced!');
  }
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Finished updating configuracion/page.tsx');
