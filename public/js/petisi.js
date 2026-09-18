(function () {
  const cfg = window.PETISI_CONFIG || {};
  let sb = null;

  function petisiEnabled() {
    return !!(cfg.enabled && cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  }

  function client() {
    if (!petisiEnabled()) return null;
    if (!sb) sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return sb;
  }

  function normEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchCampaigns() {
    const supabase = client();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("campaigns")
      .select("id,slug,title,summary,demand,target_label,isu_id,status,show_public_names,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function countVerified(campaignId) {
    const supabase = client();
    if (!supabase) return 0;
    const { count, error } = await supabase
      .from("signatures")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .not("verified_at", "is", null);
    if (error) throw error;
    return count || 0;
  }

  async function findByIsuId(isuId) {
    const rows = await fetchCampaigns();
    return rows.find((c) => c.isu_id === isuId && c.status === "open") || null;
  }

  function renderDisabled(root) {
    root.innerHTML = `<p class="muted">Petisi belum dihubungkan ke backend. Isi <code>petisi-config.js</code> setelah project Supabase siap (lihat <code>supabase/README.md</code>).</p>`;
  }

  async function renderList(root, navigate) {
    if (!petisiEnabled()) {
      renderDisabled(root);
      return;
    }
    root.innerHTML = `<p class="muted" id="petisi-status">Memuat…</p>`;
    try {
      const rows = await fetchCampaigns();
      const open = rows.filter((c) => c.status === "open").slice(0, 3);
      const closed = rows.filter((c) => c.status === "closed");
      const counts = await Promise.all(open.map((c) => countVerified(c.id)));
      const openHtml = open.length
        ? open
            .map((c, i) => {
              const n = counts[i];
              return `<article class="petisi-item">
                <h2><button type="button" class="petisi-link" data-petisi-open="${esc(c.id)}">${esc(c.title)}</button></h2>
                <p class="petisi-meta">${esc(c.target_label || "Petisi publik")} · <strong>${n}</strong> terverifikasi</p>
                <button type="button" class="btn btn-primary" data-petisi-open="${esc(c.id)}">Tanda tangani</button>
              </article>`;
            })
            .join("")
        : `<p class="muted">Belum ada petisi aktif.</p>`;
      const closedHtml = closed.length
        ? `<div class="petisi-closed">
            <p class="muted" style="margin:1.5rem 0 0.5rem">Ditutup</p>
            ${closed
              .map(
                (c) => `<article class="petisi-item">
              <h2><button type="button" class="petisi-link" data-petisi-open="${esc(c.id)}">${esc(c.title)}</button></h2>
              <p class="petisi-meta">Ditutup</p>
            </article>`
              )
              .join("")}
          </div>`
        : "";
      root.innerHTML = openHtml + closedHtml;
      root.querySelectorAll("[data-petisi-open]").forEach((btn) => {
        btn.addEventListener("click", () => navigate(btn.getAttribute("data-petisi-open")));
      });
    } catch (err) {
      root.innerHTML = `<p class="error">Gagal memuat petisi. ${esc(err.message || err)}</p>`;
    }
  }

  async function renderDetail(root, campaignId, navigate, kecamatanList) {
    if (!petisiEnabled()) {
      renderDisabled(root);
      return;
    }
    root.innerHTML = `<p class="muted">Memuat…</p>`;
    try {
      const supabase = client();
      const { data: c, error } = await supabase
        .from("campaigns")
        .select("id,slug,title,summary,demand,target_label,isu_id,status,show_public_names")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw error;
      if (!c) {
        root.innerHTML = `<p class="muted">Petisi tidak ditemukan.</p>
          <button type="button" class="btn" data-petisi-back>Kembali</button>`;
        root.querySelector("[data-petisi-back]")?.addEventListener("click", () => navigate(""));
        return;
      }
      const n = await countVerified(c.id);
      const kecOpts = (kecamatanList || [])
        .map((k) => `<option value="${esc(k)}">${esc(k)}</option>`)
        .join("");
      const formBlock =
        c.status === "open"
          ? `<form class="form-grid" id="form-petisi" novalidate>
              <label class="field" for="petisi-nama">
                <span class="field-label">Nama tampil</span>
                <input id="petisi-nama" name="nama" required minlength="2" maxlength="120" autocomplete="name">
                <p class="field-error" id="petisi-nama-err" hidden></p>
              </label>
              <label class="field" for="petisi-email">
                <span class="field-label">Email</span>
                <input id="petisi-email" name="email" type="email" required autocomplete="email">
                <p class="field-error" id="petisi-email-err" hidden></p>
              </label>
              <label class="field" for="petisi-kec">
                <span class="field-label">Kecamatan (opsional)</span>
                <select id="petisi-kec" name="kecamatan">
                  <option value="">—</option>
                  ${kecOpts}
                </select>
              </label>
              <p class="form-msg" id="petisi-error" role="alert" hidden></p>
              <p class="form-msg form-msg-ok" id="petisi-ok" role="status" hidden></p>
              <button class="btn btn-primary" type="submit">Kirim tautan verifikasi</button>
            </form>`
          : `<p class="muted">Petisi ditutup. Total <strong>${n}</strong> tanda tangan terverifikasi.</p>`;

      root.innerHTML = `
        <p style="margin:0 0 1rem"><button type="button" class="btn" data-petisi-back>← Daftar petisi</button></p>
        <h1 class="petisi-title">${esc(c.demand || c.title)}</h1>
        <p class="muted">${esc(c.summary)}</p>
        <p class="petisi-count">${n}</p>
        <p class="muted" style="margin:0 0 1.25rem">tanda tangan terverifikasi</p>
        <p class="muted" style="margin:0 0 1rem">Target: ${esc(c.target_label || "—")}${
          c.isu_id ? ` · terkait isu #${esc(c.isu_id)}` : ""
        }</p>
        ${formBlock}`;

      root.querySelector("[data-petisi-back]")?.addEventListener("click", () => navigate(""));
      const form = root.querySelector("#form-petisi");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          await submitSign(c.id, form, () => renderDetail(root, campaignId, navigate, kecamatanList));
        });
      }
    } catch (err) {
      root.innerHTML = `<p class="error">Gagal memuat petisi. ${esc(err.message || err)}</p>`;
    }
  }

  async function submitSign(campaignId, form, onDone) {
    const nama = form.querySelector("#petisi-nama");
    const email = form.querySelector("#petisi-email");
    const kec = form.querySelector("#petisi-kec");
    const errBox = form.querySelector("#petisi-error");
    const okBox = form.querySelector("#petisi-ok");
    const namaErr = form.querySelector("#petisi-nama-err");
    const emailErr = form.querySelector("#petisi-email-err");
    [namaErr, emailErr, errBox, okBox].forEach((el) => {
      if (!el) return;
      el.hidden = true;
      el.textContent = "";
    });

    let ok = true;
    if (!nama.value.trim() || nama.value.trim().length < 2) {
      namaErr.textContent = "Nama minimal 2 karakter.";
      namaErr.hidden = false;
      ok = false;
    }
    const em = normEmail(email.value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      emailErr.textContent = "Email tidak valid.";
      emailErr.hidden = false;
      ok = false;
    }
    if (!ok) return;

    const supabase = client();
    const btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      const { error: insErr } = await supabase.from("signatures").insert({
        campaign_id: campaignId,
        display_name: nama.value.trim(),
        email_normalized: em,
        kecamatan: kec.value || null,
        verified_at: null,
      });
      if (insErr) {
        if (insErr.code === "23505") {
          errBox.textContent = "Email ini sudah terdaftar untuk petisi ini. Cek kotak masuk untuk tautan verifikasi, atau gunakan email lain.";
        } else {
          errBox.textContent = insErr.message || "Gagal menyimpan.";
        }
        errBox.hidden = false;
        return;
      }
      const redirectTo =
        window.location.origin +
        "/?tab=petisi&petisi=" +
        encodeURIComponent(campaignId) +
        "&verify=1";
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: em,
        options: { emailRedirectTo: redirectTo },
      });
      if (otpErr) {
        errBox.textContent = otpErr.message || "Gagal mengirim email verifikasi.";
        errBox.hidden = false;
        return;
      }
      okBox.textContent = "Cek email untuk mengonfirmasi tanda tangan.";
      okBox.hidden = false;
      form.reset();
    } catch (err) {
      errBox.textContent = err.message || "Terjadi kesalahan.";
      errBox.hidden = false;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function maybeVerify(campaignId) {
    if (!petisiEnabled() || !campaignId) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("verify") !== "1") return false;
    const supabase = client();
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) return false;
    const { error } = await supabase.rpc("verify_my_signature", { p_campaign_id: campaignId });
    if (error) {
      console.warn("verify_my_signature", error);
      return false;
    }
    params.delete("verify");
    const qs = params.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
    return true;
  }

  async function render(root, opts) {
    if (!root) return;
    const navigate = opts.navigate || (() => {});
    const kecamatanList = opts.kecamatanList || [];
    const id = opts.petisiId || "";
    if (id) {
      await maybeVerify(id);
      await renderDetail(root, id, navigate, kecamatanList);
    } else {
      await renderList(root, navigate);
    }
  }

  window.Petisi = {
    petisiEnabled,
    client,
    normEmail,
    fetchCampaigns,
    findByIsuId,
    render,
  };
})();
