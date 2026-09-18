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

      if (!open.length && !closed.length) {
        root.innerHTML = `<div class="table-wrap"><table><tbody><tr class="empty-row"><td>Belum ada petisi aktif.</td></tr></tbody></table></div>`;
        return;
      }

      const openRows = open
        .map((c, i) => {
          const n = counts[i];
          return `<tr data-petisi-open="${esc(c.id)}" tabindex="0">
            <td data-th="Petisi" class="judul">${esc(c.title)}</td>
            <td data-th="Target" class="muted">${esc(c.target_label || "—")}</td>
            <td data-th="Terverifikasi" class="num">${n}</td>
          </tr>`;
        })
        .join("");

      let html = "";
      if (open.length) {
        html += `<div class="table-wrap table-cards table-petisi">
          <table>
            <thead><tr><th>Petisi</th><th>Target</th><th>Terverifikasi</th></tr></thead>
            <tbody>${openRows}</tbody>
          </table>
        </div>
        <p class="muted petisi-hint">Klik baris untuk membuka dan menandatangani.</p>`;
      } else {
        html += `<p class="muted">Belum ada petisi aktif.</p>`;
      }

      if (closed.length) {
        const closedRows = closed
          .map(
            (c) => `<tr data-petisi-open="${esc(c.id)}" tabindex="0">
            <td data-th="Petisi" class="judul">${esc(c.title)}</td>
            <td data-th="Status" class="muted">Ditutup</td>
            <td data-th="Target" class="muted">${esc(c.target_label || "—")}</td>
          </tr>`
          )
          .join("");
        html += `<p class="muted petisi-closed-label">Ditutup</p>
          <div class="table-wrap table-cards table-petisi">
            <table>
              <thead><tr><th>Petisi</th><th>Status</th><th>Target</th></tr></thead>
              <tbody>${closedRows}</tbody>
            </table>
          </div>`;
      }

      root.innerHTML = html;
      root.querySelectorAll("[data-petisi-open]").forEach((tr) => {
        const go = () => navigate(tr.getAttribute("data-petisi-open"));
        tr.addEventListener("click", go);
        tr.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
          }
        });
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
          <p><button type="button" class="btn" data-petisi-back>Kembali ke daftar</button></p>`;
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
              <div class="form-actions">
                <button class="btn btn-primary" type="submit">Kirim tautan verifikasi</button>
              </div>
            </form>`
          : `<p class="muted">Petisi ditutup. Total <strong class="num">${n}</strong> tanda tangan terverifikasi.</p>`;

      root.innerHTML = `
        <p class="petisi-back"><button type="button" class="btn" data-petisi-back>← Daftar petisi</button></p>
        <h1 class="lapor-title">${esc(c.demand || c.title)}</h1>
        <p class="muted petisi-summary">${esc(c.summary)}</p>
        <p class="petisi-count num">${n}</p>
        <p class="muted petisi-count-label">tanda tangan terverifikasi</p>
        <p class="muted petisi-target">Target: ${esc(c.target_label || "—")}${
          c.isu_id ? ` · isu #${esc(c.isu_id)}` : ""
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
