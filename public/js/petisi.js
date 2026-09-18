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

  const ICON_PEN =
    '<svg class="petisi-action-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M 5.114 13.6666 H 4.3333 C 3.2293 13.6666 2.3333 14.5626 2.3333 15.6666 C 2.3333 16.7706 3.2293 17.6666 4.3333 17.6666 H 19.6666 C 20.7706 17.6666 21.6666 18.5626 21.6666 19.6666 C 21.6666 20.7706 20.7706 21.6666 19.6666 21.6666 H 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M 9 13.6666 C 9 13.6666 12.1117 13.5549 13.212 12.4546 L 19.712 5.9547 C 20.5403 5.1263 20.5403 3.7831 19.712 2.9547 C 18.8836 2.1263 17.5404 2.1263 16.712 2.9547 L 10.212 9.4547 C 9.1745 10.4921 9 13.6666 9 13.6666 Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  const ICON_SHARE =
    '<svg class="petisi-action-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.5 2.25C14.7051 2.25 13.25 3.70507 13.25 5.5C13.25 5.69591 13.2673 5.88776 13.3006 6.07412L8.56991 9.38558C8.54587 9.4024 8.52312 9.42038 8.50168 9.43939C7.94993 9.00747 7.25503 8.75 6.5 8.75C4.70507 8.75 3.25 10.2051 3.25 12C3.25 13.7949 4.70507 15.25 6.5 15.25C7.25503 15.25 7.94993 14.9925 8.50168 14.5606C8.52312 14.5796 8.54587 14.5976 8.56991 14.6144L13.3006 17.9259C13.2673 18.1122 13.25 18.3041 13.25 18.5C13.25 20.2949 14.7051 21.75 16.5 21.75C18.2949 21.75 19.75 20.2949 19.75 18.5C19.75 16.7051 18.2949 15.25 16.5 15.25C15.4472 15.25 14.5113 15.7506 13.9174 16.5267L9.43806 13.3911C9.63809 12.9694 9.75 12.4978 9.75 12C9.75 11.5022 9.63809 11.0306 9.43806 10.6089L13.9174 7.4733C14.5113 8.24942 15.4472 8.75 16.5 8.75C18.2949 8.75 19.75 7.29493 19.75 5.5C19.75 3.70507 18.2949 2.25 16.5 2.25ZM14.75 5.5C14.75 4.5335 15.5335 3.75 16.5 3.75C17.4665 3.75 18.25 4.5335 18.25 5.5C18.25 6.4665 17.4665 7.25 16.5 7.25C15.5335 7.25 14.75 6.4665 14.75 5.5ZM6.5 10.25C5.5335 10.25 4.75 11.0335 4.75 12C4.75 12.9665 5.5335 13.75 6.5 13.75C7.4665 13.75 8.25 12.9665 8.25 12C8.25 11.0335 7.4665 10.25 6.5 10.25ZM16.5 16.75C15.5335 16.75 14.75 17.5335 14.75 18.5C14.75 19.4665 15.5335 20.25 16.5 20.25C17.4665 20.25 18.25 19.4665 18.25 18.5C18.25 17.5335 17.4665 16.75 16.5 16.75Z" fill="currentColor"/></svg>';

  function petisiUrl(id) {
    return window.location.origin + "/?tab=petisi&petisi=" + encodeURIComponent(id);
  }

  async function sharePetisi(c) {
    const url = petisiUrl(c.id);
    const title = c.title || "Petisi Atlas Bojonegoro";
    const text = c.summary || c.demand || title;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      window.alert("Tautan petisi disalin.");
    } catch (e) {
      window.prompt("Salin tautan petisi:", url);
    }
  }

  function cardActions(c, closed) {
    if (closed) {
      return `<div class="petisi-card-actions" role="group" aria-label="Aksi petisi">
        <button type="button" class="petisi-pill-btn" data-petisi-share="${esc(c.id)}" aria-label="Sebarkan" title="Sebarkan">${ICON_SHARE}</button>
        <button type="button" class="petisi-pill-btn is-primary" data-petisi-open="${esc(c.id)}">${ICON_PEN}<span>Lihat</span></button>
      </div>`;
    }
    return `<div class="petisi-card-actions" role="group" aria-label="Aksi petisi">
      <button type="button" class="petisi-pill-btn" data-petisi-share="${esc(c.id)}" aria-label="Sebarkan" title="Sebarkan">${ICON_SHARE}</button>
      <button type="button" class="petisi-pill-btn is-primary" data-petisi-open="${esc(c.id)}">${ICON_PEN}<span>Tanda Tangan</span></button>
    </div>`;
  }

  function coverUrl(c) {
    return "/assets/petisi/" + encodeURIComponent(c.slug || "og") + ".jpg";
  }

  function campaignCard(c, n, closed) {
    return `<article class="petisi-card${closed ? " is-closed" : ""}">
      <figure class="petisi-card-media">
        <img src="${esc(coverUrl(c))}" alt="" width="640" height="400" loading="lazy" decoding="async" data-petisi-card-cover>
      </figure>
      <div class="petisi-card-main">
        <h2 class="petisi-card-title">${esc(c.title)}</h2>
        <p class="petisi-card-desc">${esc(c.summary || c.demand)}</p>
      </div>
      <footer class="petisi-card-foot">
        <p class="petisi-card-meta"><span class="num">${n ?? "—"}</span> terverifikasi · ${esc(c.target_label || "Petisi publik")}${closed ? " · Ditutup" : ""}</p>
        ${cardActions(c, closed)}
      </footer>
    </article>`;
  }

  async function renderList(root, navigate) {
    if (!petisiEnabled()) {
      renderDisabled(root);
      return;
    }
    root.closest(".petisi-page")?.classList.remove("is-detail");
    root.innerHTML = `<p class="muted" id="petisi-status">Memuat…</p>`;
    try {
      const rows = await fetchCampaigns();
      const open = rows.filter((c) => c.status === "open").slice(0, 3);
      const closed = rows.filter((c) => c.status === "closed");
      const counts = await Promise.all(open.map((c) => countVerified(c.id)));
      const closedCounts = await Promise.all(closed.map((c) => countVerified(c.id)));

      if (!open.length && !closed.length) {
        root.innerHTML = `<p class="muted">Belum ada petisi aktif.</p>`;
        return;
      }

      let html = "";
      if (open.length) {
        html += `<div class="petisi-card-list">${open.map((c, i) => campaignCard(c, counts[i], false)).join("")}</div>`;
      } else {
        html += `<p class="muted">Belum ada petisi aktif.</p>`;
      }
      if (closed.length) {
        html += `<p class="muted petisi-closed-label">Ditutup</p>
          <div class="petisi-card-list">${closed.map((c, i) => campaignCard(c, closedCounts[i], true)).join("")}</div>`;
      }

      root.innerHTML = html;
      root.querySelectorAll("[data-petisi-card-cover]").forEach((img) => {
        img.addEventListener(
          "error",
          () => {
            img.src = "/assets/og/og-image.png";
          },
          { once: true }
        );
      });
      const byId = Object.fromEntries(rows.map((c) => [c.id, c]));
      root.querySelectorAll("[data-petisi-open]").forEach((btn) => {
        btn.addEventListener("click", () => navigate(btn.getAttribute("data-petisi-open")));
      });
      root.querySelectorAll("[data-petisi-share]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const id = btn.getAttribute("data-petisi-share");
          const c = byId[id];
          if (c) sharePetisi(c);
        });
      });
    } catch (err) {
      root.innerHTML = `<p class="error">Gagal memuat petisi. ${esc(err.message || err)}</p>`;
    }
  }

  function placeSelectList(btn, list) {
    list.style.top = `${Math.round(btn.offsetHeight) + 8}px`;
  }

  function closePetisiSelects(scope) {
    (scope || document).querySelectorAll(".petisi-sign .select-list").forEach((n) => {
      n.hidden = true;
      n.previousElementSibling?.setAttribute("aria-expanded", "false");
    });
  }

  function bindPetisiKecSelect(host, options) {
    if (!host) return;
    const hidden = host.parentElement?.querySelector('input[name="kecamatan"]');
    const labelledBy = "petisi-kec-label";
    const valueId = "petisi-kec-value-label";
    let value = hidden?.value || "";
    const opts = [{ value: "", label: "—" }, ...(options || []).map((k) => ({ value: k, label: k }))];

    function paint() {
      const cur = opts.find((o) => o.value === value) || opts[0];
      host.innerHTML = `<button type="button" class="select-btn" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${labelledBy} ${valueId}"><span class="select-btn-label" id="${valueId}">${esc(cur.label)}</span></button>
        <div class="select-list" role="listbox" hidden>
          ${opts
            .map(
              (o) =>
                `<button type="button" role="option" data-value="${esc(o.value)}" aria-selected="${o.value === value}">${esc(o.label)}</button>`
            )
            .join("")}
        </div>`;
      const btn = host.querySelector(".select-btn");
      const list = host.querySelector(".select-list");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = list.hidden;
        closePetisiSelects(host.closest(".petisi-sign") || document);
        list.hidden = !open;
        btn.setAttribute("aria-expanded", String(!list.hidden));
        if (!list.hidden) placeSelectList(btn, list);
      });
      list.querySelectorAll("button").forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          value = opt.getAttribute("data-value") || "";
          if (hidden) hidden.value = value;
          paint();
        });
      });
    }
    paint();
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
      const cover = "/assets/petisi/" + encodeURIComponent(c.slug) + ".jpg";
      const formBlock =
        c.status === "open"
          ? `<form class="form-grid petisi-sign-form" id="form-petisi" novalidate>
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
              <div class="field">
                <span class="field-label" id="petisi-kec-label">Kecamatan (opsional)</span>
                <div class="select" id="petisi-kec"></div>
                <input type="hidden" name="kecamatan" id="petisi-kec-hidden" value="">
              </div>
              <label class="field field-check" for="petisi-show-name">
                <input id="petisi-show-name" name="show_name" type="checkbox" value="1">
                <span>Cantumkan nama saya pada petisi</span>
              </label>
              <p class="form-msg" id="petisi-error" role="alert" hidden></p>
              <p class="form-msg form-msg-ok" id="petisi-ok" role="status" hidden></p>
              <div class="form-actions">
                <button class="btn btn-primary" type="submit">${ICON_PEN}<span>Tanda Tangan</span></button>
              </div>
            </form>`
          : `<p class="muted petisi-sign-closed">Petisi ditutup. Total <strong class="num">${n}</strong> tanda tangan terverifikasi.</p>`;

      root.closest(".petisi-page")?.classList.add("is-detail");
      root.innerHTML = `
        <article class="petisi-detail">
          <figure class="petisi-hero">
            <img src="${esc(cover)}" alt="${esc(c.title)}" width="1600" height="900" decoding="async" data-petisi-cover>
          </figure>
          <div class="petisi-detail-copy">
            <h1 class="petisi-detail-title">${esc(c.title)}</h1>
            <p class="petisi-detail-summary">${esc(c.summary)}</p>
            <p class="petisi-detail-demand">${esc(c.demand)}</p>
            <div class="petisi-detail-meta">
              <p class="petisi-count num">${n}</p>
              <p class="muted petisi-count-label">tanda tangan terverifikasi</p>
              <p class="muted petisi-target">Target: ${esc(c.target_label || "—")}${
                c.isu_id ? ` · isu #${esc(c.isu_id)}` : ""
              }</p>
            </div>
            <div class="petisi-detail-share">
              <button type="button" class="petisi-pill-btn" data-petisi-share="${esc(c.id)}" aria-label="Sebarkan" title="Sebarkan">${ICON_SHARE}<span>Sebarkan</span></button>
            </div>
          </div>
          <aside class="petisi-sign" aria-labelledby="petisi-sign-heading">
            <h2 id="petisi-sign-heading" class="petisi-sign-title">Tanda tangan</h2>
            ${formBlock}
          </aside>
        </article>`;

      const coverImg = root.querySelector("[data-petisi-cover]");
      if (coverImg) {
        coverImg.addEventListener(
          "error",
          () => {
            coverImg.src = "/assets/og/og-image.png";
          },
          { once: true }
        );
      }
      bindPetisiKecSelect(root.querySelector("#petisi-kec"), kecamatanList || []);
      root.querySelector("[data-petisi-share]")?.addEventListener("click", () => sharePetisi(c));
      const form = root.querySelector("#form-petisi");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          await submitSign(c.id, form, kecamatanList || [], () =>
            renderDetail(root, campaignId, navigate, kecamatanList)
          );
        });
      }
    } catch (err) {
      root.closest(".petisi-page")?.classList.remove("is-detail");
      root.innerHTML = `<p class="error">Gagal memuat petisi. ${esc(err.message || err)}</p>`;
    }
  }

  async function submitSign(campaignId, form, kecamatanList, onDone) {
    const nama = form.querySelector("#petisi-nama");
    const email = form.querySelector("#petisi-email");
    const kec = form.querySelector("#petisi-kec-hidden");
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
      const showName = !!form.querySelector("#petisi-show-name")?.checked;
      const { error: insErr } = await supabase.from("signatures").insert({
        campaign_id: campaignId,
        display_name: nama.value.trim(),
        email_normalized: em,
        kecamatan: kec?.value || null,
        show_name: showName,
        verified_at: null,
      });
      if (insErr) {
        if (insErr.code === "23505") {
          errBox.textContent =
            "Email ini sudah terdaftar untuk petisi ini. Cek kotak masuk untuk tautan verifikasi, atau gunakan email lain.";
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
      const hidden = form.querySelector("#petisi-kec-hidden");
      if (hidden) hidden.value = "";
      bindPetisiKecSelect(form.querySelector("#petisi-kec"), kecamatanList || []);
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
