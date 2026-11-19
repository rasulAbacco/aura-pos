/**
 * Up to N photos for a product (3) or the salon (6). First photo = main photo in the customer app.
 * With `uploadUrl` the photos are saved straight away. Without it (a product not saved yet) the chosen
 * files are kept in `pending` and uploaded by the caller after saving (see uploadPending).
 */
import { useEffect, useRef, useState } from "react";
import { LuImagePlus, LuStar, LuTrash2, LuLoaderCircle } from "react-icons/lu";
import { api, errorMessage, API_BASE_URL } from "../../lib/api.js";
import { resizeImage } from "../../lib/imageResize.js";
import { useToast } from "../../contexts/ToastContext.jsx";
import { cx } from "../../utils/cx.js";

export const photoUrl = (id) => `${API_BASE_URL}/media/${id}`;

async function send(url, { blob, width, height }) {
  const r = await api.post(`${url}?w=${width}&h=${height}`, blob, {
    headers: { "Content-Type": blob.type },
  });
  return r.data.data;
}

/** Upload photos chosen before the product existed. */
export async function uploadPending(url, pending) {
  for (const p of pending) await send(url, p);
}

export function PhotoManager({
  max,
  uploadUrl,
  orderUrl,
  initial = [],
  pending,
  onPendingChange,
  onChange,
  onBusyChange,
  disabled,
  label = "Photos",
}) {
  const toast = useToast();
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(0);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  const input = useRef(null);
  const live = !!uploadUrl;
  const previews = useRef(new Map());
  useEffect(
    () => () => {
      previews.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );
  const previewOf = (p) => {
    if (!previews.current.has(p))
      previews.current.set(p, URL.createObjectURL(p.blob));
    return previews.current.get(p);
  };

  const items = live ? photos : pending ?? [];
  const room = max - items.length - busy;

  const add = async (files) => {
    const list = [...files].slice(0, Math.max(0, room));
    if (files.length > list.length)
      toast(`Only ${max} photos allowed — extra photos were skipped`, "error");
    let done = 0;
    for (const f of list) {
      setBusy((b) => b + 1);
      try {
        const resized = await resizeImage(f);
        if (live) {
          const saved = await send(uploadUrl, resized);
          setPhotos((p) => [...p, saved]);
          onChange?.();
        } else {
          onPendingChange((p) => [...p, resized]);
        }
        done += 1;
      } catch (e) {
        toast(e?.isAxiosError ? errorMessage(e) : e.message, "error");
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (done)
      toast(
        live
          ? `${done} photo${done === 1 ? "" : "s"} uploaded and saved`
          : `${done} photo${
              done === 1 ? "" : "s"
            } added — saved when you add the product`,
      );
  };

  const remove = async (i) => {
    if (!live) {
      onPendingChange((p) => p.filter((_, k) => k !== i));
      return;
    }
    const ph = photos[i];
    try {
      await api.delete(`/media/${ph.id}`);
      setPhotos((p) => p.filter((x) => x.id !== ph.id));
      onChange?.();
      toast("Photo removed");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const makeMain = async (i) => {
    if (!live) {
      onPendingChange((p) => [p[i], ...p.filter((_, k) => k !== i)]);
      return;
    }
    const ids = [
      photos[i].id,
      ...photos.filter((_, k) => k !== i).map((x) => x.id),
    ];
    try {
      const r = await api.put(orderUrl, { ids });
      setPhotos(r.data.data);
      onChange?.();
      toast("Main photo changed");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-700">
        {label}{" "}
        <span className="font-normal text-stone-500">
          ({items.length}/{max}) · first photo is the main one
        </span>
      </p>
      <div className="flex flex-wrap gap-3">
        {items.map((p, i) => (
          <figure
            key={live ? p.id : i}
            className="group relative h-24 w-24 overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
          >
            <img
              src={live ? photoUrl(p.id) : previewOf(p)}
              alt={`Photo ${i + 1}`}
              className="h-full w-full object-cover"
            />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-stone-900/80 px-1.5 text-[10px] font-semibold text-white">
                Main
              </span>
            )}
            {!disabled && (
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1">
                {i > 0 ? (
                  <button
                    type="button"
                    title="Make main photo"
                    aria-label={`Make photo ${i + 1} the main photo`}
                    onClick={() => makeMain(i)}
                    className="rounded bg-white/90 p-1 text-stone-800"
                  >
                    <LuStar size={13} />
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  title="Remove photo"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => remove(i)}
                  className="rounded bg-white/90 p-1 text-rose-700"
                >
                  <LuTrash2 size={13} />
                </button>
              </div>
            )}
          </figure>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div
            key={`b${i}`}
            className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-stone-300"
          >
            <LuLoaderCircle
              className="animate-spin text-stone-400"
              aria-label="Uploading"
            />
          </div>
        ))}
        {room > 0 && !disabled && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-500 hover:border-rose-400 hover:text-rose-700"
          >
            <LuImagePlus size={20} aria-hidden />
            Add photo
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <p className={cx("mt-1 text-xs text-stone-500")}>
        Square photos on a plain background look best. Large photos are resized
        automatically.
      </p>
    </div>
  );
}
