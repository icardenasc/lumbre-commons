import { Locale, languages, localizedPath, unlocalizedPath } from "./locales";
import { localeCopy } from "./locale-copy";
import { escapeHtml as e } from "./model";
const extra: Record<string, Record<Exclude<Locale, "es">, string>> = {
  Idioma: { en: "Language", pt: "Idioma", fr: "Langue" },
  "Idioma del manuscrito": {
    en: "Manuscript language",
    pt: "Idioma do manuscrito",
    fr: "Langue du manuscrit",
  },
  "Traducción de lectura": {
    en: "Reading translation",
    pt: "Tradução para leitura",
    fr: "Traduction de lecture",
  },
  "Texto original": {
    en: "Original text",
    pt: "Texto original",
    fr: "Texte original",
  },
  "Traducir esta versión": {
    en: "Translate this version",
    pt: "Traduzir esta versão",
    fr: "Traduire cette version",
  },
  "Preparando traducción…": {
    en: "Preparing translation…",
    pt: "Preparando tradução…",
    fr: "Préparation de la traduction…",
  },
  "Traducción completada. Abriendo el artículo…": {
    en: "Translation complete. Opening the article…",
    pt: "Tradução concluída. Abrindo o artigo…",
    fr: "Traduction terminée. Ouverture de l’article…",
  },
  "La traducción continúa en segundo plano. Puedes volver a esta página.": {
    en: "Translation continues in the background. You can return to this page.",
    pt: "A tradução continua em segundo plano. Você pode voltar a esta página.",
    fr: "La traduction continue en arrière-plan. Vous pouvez revenir sur cette page.",
  },
  "Ejemplo editorial": {
    en: "Editorial demonstration",
    pt: "Demonstração editorial",
    fr: "Démonstration éditoriale",
  },
  "Datos sintéticos · Demostración reproducible": {
    en: "Synthetic data · Reproducible demonstration",
    pt: "Dados sintéticos · Demonstração reprodutível",
    fr: "Données synthétiques · Démonstration reproductible",
  },
  "Artículo de demostración, sin revisión independiente. Los cálculos y los materiales enlazados pueden examinarse.":
    {
      en: "Demonstration article, without independent peer review. Calculations and linked materials are available for inspection.",
      pt: "Artigo de demonstração, sem revisão independente. Os cálculos e os materiais vinculados podem ser examinados.",
      fr: "Article de démonstration, sans évaluation indépendante. Les calculs et les documents liés peuvent être examinés.",
    },
  "Figura y materiales reproducibles": {
    en: "Figure and reproducible materials",
    pt: "Figura e materiais reprodutíveis",
    fr: "Figure et documents reproductibles",
  },
  "Descargar datos CSV": {
    en: "Download CSV data",
    pt: "Baixar dados CSV",
    fr: "Télécharger les données CSV",
  },
  "Código de reproducción": {
    en: "Reproduction code",
    pt: "Código de reprodução",
    fr: "Code de reproduction",
  },
  "Resultados calculados": {
    en: "Computed results",
    pt: "Resultados calculados",
    fr: "Résultats calculés",
  },
  "Esta traducción ayuda a leer el trabajo. No reemplaza la versión original ni implica revisión científica.":
    {
      en: "This translation helps readers access the work. It does not replace the original version or imply scientific review.",
      pt: "Esta tradução facilita a leitura do trabalho. Não substitui a versão original nem implica revisão científica.",
      fr: "Cette traduction facilite la lecture. Elle ne remplace pas la version originale et ne constitue pas une évaluation scientifique.",
    },
  "Las referencias y los identificadores se conservan en su forma original.": {
    en: "References and identifiers are preserved in their original form.",
    pt: "As referências e os identificadores são preservados na forma original.",
    fr: "Les références et les identifiants sont conservés dans leur forme originale.",
  },
  "Volver al original": {
    en: "Read the original",
    pt: "Ler o original",
    fr: "Lire l’original",
  },
  "Ver esta versión en otro idioma": {
    en: "Read this version in another language",
    pt: "Ler esta versão em outro idioma",
    fr: "Lire cette version dans une autre langue",
  },
  "El contenido mostrado aún está en su idioma original.": {
    en: "The content below is still in its original language.",
    pt: "O conteúdo abaixo ainda está no idioma original.",
    fr: "Le contenu ci-dessous est encore dans sa langue originale.",
  },
};
Object.assign(extra, {
  "Mismo responsable de autoría": {
    en: "Same authorship responsibility",
    pt: "Mesma responsabilidade autoral",
    fr: "Même responsabilité d’auteur",
  },
  "Recibe un aporte:": {
    en: "Receives a contribution:",
    pt: "Recebe uma contribuição:",
    fr: "Reçoit une contribution :",
  },
  "Materiales de investigación": {
    en: "Research materials",
    pt: "Materiais de pesquisa",
    fr: "Documents de recherche",
  },
  "Adjunta figuras, datos, código o documentos. Los archivos del borrador son privados y se hacen accesibles al publicar la versión.":
    {
      en: "Attach figures, data, code or documents. Draft files are private and become accessible when the version is published.",
      pt: "Anexe figuras, dados, código ou documentos. Os arquivos do rascunho são privados e ficam acessíveis quando a versão é publicada.",
      fr: "Joignez des figures, données, codes ou documents. Les fichiers du brouillon sont privés et deviennent accessibles à la publication de la version.",
    },
  "Archivo (máximo 5 MB)": {
    en: "File (maximum 5 MB)",
    pt: "Arquivo (máximo 5 MB)",
    fr: "Fichier (5 Mo maximum)",
  },
  "PNG, JPG, PDF, CSV, JSON, TXT, MD o PY. Hasta ocho archivos por versión.": {
    en: "PNG, JPG, PDF, CSV, JSON, TXT, MD or PY. Up to eight files per version.",
    pt: "PNG, JPG, PDF, CSV, JSON, TXT, MD ou PY. Até oito arquivos por versão.",
    fr: "PNG, JPG, PDF, CSV, JSON, TXT, MD ou PY. Jusqu’à huit fichiers par version.",
  },
  "Adjuntar archivo": {
    en: "Attach file",
    pt: "Anexar arquivo",
    fr: "Joindre un fichier",
  },
  "Quitar del borrador": {
    en: "Remove from draft",
    pt: "Remover do rascunho",
    fr: "Retirer du brouillon",
  },
  "Guarda los cambios antes de adjuntar archivos.": {
    en: "Save changes before attaching files.",
    pt: "Salve as alterações antes de anexar arquivos.",
    fr: "Enregistrez les modifications avant de joindre des fichiers.",
  },
  "Selecciona un archivo.": {
    en: "Choose a file.",
    pt: "Selecione um arquivo.",
    fr: "Choisissez un fichier.",
  },
  "El archivo supera 5 MB.": {
    en: "The file exceeds 5 MB.",
    pt: "O arquivo ultrapassa 5 MB.",
    fr: "Le fichier dépasse 5 Mo.",
  },
  "Descargar datos CSV ↓": {
    en: "Download CSV data ↓",
    pt: "Baixar dados CSV ↓",
    fr: "Télécharger les données CSV ↓",
  },
  "Código de reproducción ↓": {
    en: "Reproduction code ↓",
    pt: "Código de reprodução ↓",
    fr: "Code de reproduction ↓",
  },
  "Resultados calculados ↓": {
    en: "Computed results ↓",
    pt: "Resultados calculados ↓",
    fr: "Résultats calculés ↓",
  },
});
Object.assign(extra, {
  "Admisión editorial. Revisión independiente no acreditada.": {
    en: "Editorial admission. Independent peer review not established.",
    pt: "Admissão editorial. Revisão independente não comprovada.",
    fr: "Admission éditoriale. Évaluation indépendante non établie.",
  },
  "Materiales e idiomas": {
    en: "Materials and languages",
    pt: "Materiais e idiomas",
    fr: "Documents et langues",
  },
  "Guarda primero el borrador para adjuntar figuras, datos, código o PDF (hasta ocho archivos de 5 MB). El texto del manuscrito se edita por secciones; no importamos Word ni LaTeX automáticamente. Selecciona su idioma original. Los lectores pueden consultar traducciones identificadas en español, inglés, portugués y francés, sin reemplazar la versión citable.":
    {
      en: "Save a draft first to attach figures, data, code or PDFs (up to eight files of 5 MB each). Manuscript text is edited by section; Word and LaTeX are not imported automatically. Select the original language. Readers can access labelled translations in Spanish, English, Portuguese and French, without replacing the citable version.",
      pt: "Salve primeiro o rascunho para anexar figuras, dados, código ou PDFs (até oito arquivos de 5 MB). O texto é editado por seções; não importamos Word nem LaTeX automaticamente. Selecione o idioma original. Os leitores podem consultar traduções identificadas em espanhol, inglês, português e francês, sem substituir a versão citável.",
      fr: "Enregistrez un brouillon pour joindre des figures, données, du code ou des PDF (huit fichiers de 5 Mo maximum). Le texte est rédigé par sections ; Word et LaTeX ne sont pas importés automatiquement. Choisissez la langue originale. Les lecteurs peuvent consulter des traductions identifiées en espagnol, anglais, portugais et français, sans remplacer la version citable.",
    },
  "Las traducciones de lectura procesan únicamente textos ya publicados mediante Cloudflare Workers AI. Se conservan por versión e idioma; pueden contener errores. Los adjuntos del borrador permanecen privados hasta su publicación. Al quitar un archivo de una nueva versión, se conserva el acceso desde las versiones ya publicadas.":
    {
      en: "Reading translations process only published texts through Cloudflare Workers AI. They are stored by version and language and may contain errors. Draft attachments remain private until publication. Removing a file from a new version preserves access through previously published versions.",
      pt: "As traduções de leitura processam apenas textos publicados usando Cloudflare Workers AI. São conservadas por versão e idioma e podem conter erros. Os anexos do rascunho permanecem privados até a publicação. A remoção de um arquivo de uma nova versão preserva o acesso pelas versões já publicadas.",
      fr: "Les traductions de lecture traitent uniquement des textes publiés avec Cloudflare Workers AI. Elles sont conservées par version et langue et peuvent contenir des erreurs. Les pièces jointes restent privées avant publication. Retirer un fichier d’une nouvelle version préserve l’accès depuis les versions déjà publiées.",
    },
});
Object.assign(extra, {
  "Uso de inteligencia artificial": {
    en: "Use of artificial intelligence",
    pt: "Uso de inteligência artificial",
    fr: "Utilisation de l’intelligence artificielle",
  },
  "Un material adjunto no pertenece a este manuscrito.": {
    en: "An attached file does not belong to this manuscript.",
    pt: "Um anexo não pertence a este manuscrito.",
    fr: "Une pièce jointe n’appartient pas à ce manuscrit.",
  },
  "Manuscrito no encontrado.": {
    en: "Manuscript not found.",
    pt: "Manuscrito não encontrado.",
    fr: "Manuscrit introuvable.",
  },
  "Material no encontrado.": {
    en: "Material not found.",
    pt: "Material não encontrado.",
    fr: "Document introuvable.",
  },
  "El manuscrito está bloqueado para edición.": {
    en: "This manuscript is locked for editing.",
    pt: "Este manuscrito está bloqueado para edição.",
    fr: "Ce manuscrit est verrouillé pour modification.",
  },
  "El borrador cambió. Actualiza la página.": {
    en: "The draft changed. Refresh the page.",
    pt: "O rascunho mudou. Atualize a página.",
    fr: "Le brouillon a changé. Actualisez la page.",
  },
  "Puedes adjuntar hasta ocho materiales por versión.": {
    en: "You can attach up to eight files per version.",
    pt: "Você pode anexar até oito arquivos por versão.",
    fr: "Vous pouvez joindre huit fichiers par version.",
  },
  "Nombre de archivo inválido.": {
    en: "Invalid filename.",
    pt: "Nome de arquivo inválido.",
    fr: "Nom de fichier non valide.",
  },
  "Formato permitido: PNG, JPG, PDF, CSV, JSON, TXT, MD o PY.": {
    en: "Allowed formats: PNG, JPG, PDF, CSV, JSON, TXT, MD or PY.",
    pt: "Formatos permitidos: PNG, JPG, PDF, CSV, JSON, TXT, MD ou PY.",
    fr: "Formats autorisés : PNG, JPG, PDF, CSV, JSON, TXT, MD ou PY.",
  },
  "El archivo supera 5 MB.": {
    en: "The file exceeds 5 MB.",
    pt: "O arquivo ultrapassa 5 MB.",
    fr: "Le fichier dépasse 5 Mo.",
  },
  "Archivo vacío.": {
    en: "Empty file.",
    pt: "Arquivo vazio.",
    fr: "Fichier vide.",
  },
  "Los archivos de texto deben usar UTF-8.": {
    en: "Text files must use UTF-8.",
    pt: "Os arquivos de texto devem usar UTF-8.",
    fr: "Les fichiers texte doivent utiliser UTF-8.",
  },
  "La traducción de lectura no está disponible en este momento.": {
    en: "Reading translation is currently unavailable.",
    pt: "A tradução para leitura está indisponível no momento.",
    fr: "La traduction de lecture est actuellement indisponible.",
  },
  "El artículo supera el límite de traducción de 80.000 caracteres.": {
    en: "The article exceeds the translation limit of 80,000 characters.",
    pt: "O artigo excede o limite de tradução de 80.000 caracteres.",
    fr: "L’article dépasse la limite de traduction de 80 000 caractères.",
  },
  "No se traducen publicaciones retiradas.": {
    en: "Withdrawn publications cannot be translated.",
    pt: "Publicações retiradas não podem ser traduzidas.",
    fr: "Les publications retirées ne peuvent pas être traduites.",
  },
  "El proveedor no pudo completar la traducción. Puedes reintentar; los segmentos completados se conservan.":
    {
      en: "The provider could not finish the translation. You can retry; completed passages are preserved.",
      pt: "O provedor não concluiu a tradução. Você pode tentar novamente; os trechos concluídos são preservados.",
      fr: "Le fournisseur n’a pas pu terminer la traduction. Vous pouvez réessayer ; les passages terminés sont conservés.",
    },
  "El contenido no corresponde a una imagen PNG.": {
    en: "The content is not a valid PNG file.",
    pt: "O conteúdo não corresponde a um arquivo PNG válido.",
    fr: "Le contenu ne correspond pas à un fichier PNG valide.",
  },
  "El contenido no corresponde a una imagen JPEG.": {
    en: "The content is not a valid JPEG file.",
    pt: "O conteúdo não corresponde a um arquivo JPEG válido.",
    fr: "Le contenu ne correspond pas à un fichier JPEG valide.",
  },
  "El contenido no corresponde a un PDF.": {
    en: "The content is not a valid PDF file.",
    pt: "O conteúdo não corresponde a um arquivo PDF válido.",
    fr: "Le contenu ne correspond pas à un fichier PDF valide.",
  },
});
const allCopy = { ...localeCopy, ...extra };
export function messages(lang: Locale) {
  return Object.fromEntries(
    Object.entries(allCopy).map(([k, v]) => [
      k,
      lang === "es" ? k : v[lang] || k,
    ]),
  );
}
export function tr(text: string, lang: Locale): string {
  if (lang === "es") return text;
  if (text.endsWith(" · Lumbre"))
    return tr(text.slice(0, -9), lang) + " · Lumbre";
  const arrow = text.match(/^(.*?)( [↗→↓＋])$/);
  if (arrow) return tr(arrow[1], lang) + arrow[2];
  if (/^Leer /.test(text))
    return { en: "Read ", pt: "Ler ", fr: "Lire " }[lang] + text.slice(5);
  const bylineVersion = text.match(/^(\s*·\s*)Versión (\d+)$/);
  if (bylineVersion)
    return bylineVersion[1] + tr("Versión " + bylineVersion[2], lang);
  if (text.includes("Textos bajo CC BY 4.0"))
    return text.replace(
      "Textos bajo CC BY 4.0",
      {
        en: "Texts under CC BY 4.0",
        pt: "Textos sob CC BY 4.0",
        fr: "Textes sous CC BY 4.0",
      }[lang],
    );
  const key = text.trim(),
    d = allCopy;
  const exact = d[key]?.[lang];
  let result = exact;
  if (!result) {
    const count = key.match(/^(\d+) (publicaciones|min de lectura)$/);
    if (count)
      result =
        count[1] +
        " " +
        {
          en: { publicaciones: "publications", "min de lectura": "min read" },
          pt: {
            publicaciones: "publicações",
            "min de lectura": "min de leitura",
          },
          fr: {
            publicaciones: "publications",
            "min de lectura": "min de lecture",
          },
        }[lang][count[2] as "publicaciones" | "min de lectura"];
    const version = key.match(/^Versión (\d+)$/);
    if (version)
      result =
        { en: "Version ", pt: "Versão ", fr: "Version " }[lang] + version[1];
    const progress = key.match(/^(\d+) de 8 secciones básicas$/);
    if (progress)
      result =
        progress[1] +
        {
          en: " of 8 core sections",
          pt: " de 8 seções básicas",
          fr: " sur 8 sections principales",
        }[lang];
  }
  return result ? text.replace(key, result) : text;
}
export async function localizeResponse(
  response: Response,
  url: URL,
  lang: Locale,
) {
  const h = new Headers(response.headers);
  if (h.has("Location")) {
    const target = new URL(h.get("Location")!, url.origin);
    if (target.origin === url.origin) {
      target.pathname = localizedPath(target.pathname, lang);
      h.set("Location", target.href);
    }
    return new Response(response.body, { status: response.status, headers: h });
  }
  if (!h.get("Content-Type")?.includes("text/html")) return response;
  h.set("Content-Language", lang);
  h.set("Vary", "Accept-Language");
  const plain = unlocalizedPath(url.pathname),
    query = url.search;
  const switcher = `<nav class="language-switch" aria-label="${e(tr("Idioma", lang))}">${Object.entries(
    languages,
  )
    .map(
      ([l, label]) =>
        `<a href="${e(localizedPath(plain, l as Locale) + query)}" lang="${l}" hreflang="${l}" ${l === lang ? 'aria-current="true"' : ""} data-locale-link>${l.toUpperCase()}<span class="sr-only"> ${label}</span></a>`,
    )
    .join("")}</nav>`;
  let skip = 0,
    buffer = "";
  const rewriter = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("lang", lang);
      },
    })
    .on("head", {
      element(el) {
        el.append(
          `${Object.keys(languages)
            .map(
              (l) =>
                `<link rel="alternate" hreflang="${l}" href="${e(url.origin + localizedPath(plain, l as Locale) + query)}">`,
            )
            .join("")}<script src="/i18n/${lang}.js" defer></script>`,
          { html: true },
        );
      },
    })
    .on(".utility-bar > div", {
      element(el) {
        el.prepend(switcher, { html: true });
      },
    })
    .on("a[href],form[action],[data-next]", {
      element(el) {
        if (el.hasAttribute("data-locale-link")) return;
        for (const attr of ["href", "action", "data-next"]) {
          const value = el.getAttribute(attr);
          if (value?.startsWith("/") && !value.startsWith("//"))
            el.setAttribute(attr, localizedPath(value, lang));
        }
      },
    })
    .on(
      '[placeholder],[aria-label],[title],meta[name="description"],meta[property="og:description"]',
      {
        element(el) {
          if (el.hasAttribute("data-content")) return;
          for (const attr of [
            "placeholder",
            "aria-label",
            "title",
            "content",
          ]) {
            const value = el.getAttribute(attr);
            if (value) el.setAttribute(attr, tr(value, lang));
          }
        },
      },
    )
    .on("[data-content],textarea,script,style,code", {
      element(el) {
        skip++;
        el.onEndTag(() => {
          skip--;
        });
      },
    })
    .onDocument({
      text(chunk) {
        if (skip) return;
        buffer += chunk.text;
        chunk.remove();
        if (chunk.lastInTextNode) {
          chunk.before(tr(buffer, lang));
          buffer = "";
        }
      },
    });
  return rewriter.transform(
    new Response(response.body, { status: response.status, headers: h }),
  );
}
