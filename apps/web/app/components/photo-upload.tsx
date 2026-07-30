'use client';

import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react';

type PreviewFile = { id: string; file: File; url: string };
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxFileSize = 5 * 1024 * 1024;
const maxProductPhotos = 5;

const toPreview = (file: File): PreviewFile | null => {
  if (!allowedTypes.has(file.type) || file.size > maxFileSize) return null;
  return { id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: URL.createObjectURL(file) };
};

export const PhotoUpload = (): React.ReactElement => {
  const [personalPhoto, setPersonalPhoto] = useState<PreviewFile | null>(null);
  const [productPhotos, setProductPhotos] = useState<PreviewFile[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => () => {
    if (personalPhoto !== null) URL.revokeObjectURL(personalPhoto.url);
    productPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
  }, [personalPhoto, productPhotos]);

  const addPersonalPhoto = (files: FileList | null): void => {
    const preview = files?.[0] === undefined ? null : toPreview(files[0]);
    if (preview === null) { setMessage('Choose one JPG, PNG, or WebP image under 5 MB.'); return; }
    if (personalPhoto !== null) URL.revokeObjectURL(personalPhoto.url);
    setPersonalPhoto(preview); setMessage('');
  };

  const addProductPhotos = (files: FileList | null): void => {
    const next = Array.from(files ?? []).map(toPreview).filter((file): file is PreviewFile => file !== null);
    if (next.length === 0) { setMessage('Choose JPG, PNG, or WebP product images under 5 MB each.'); return; }
    const remaining = maxProductPhotos - productPhotos.length;
    setProductPhotos((current) => [...current, ...next.slice(0, remaining)]);
    setMessage(next.length > remaining ? `You can add up to ${maxProductPhotos} product photos.` : '');
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>, kind: 'personal' | 'product'): void => {
    event.preventDefault();
    if (kind === 'personal') addPersonalPhoto(event.dataTransfer.files); else addProductPhotos(event.dataTransfer.files);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>, kind: 'personal' | 'product'): void => {
    if (kind === 'personal') addPersonalPhoto(event.target.files); else addProductPhotos(event.target.files);
    event.target.value = '';
  };

  return (
    <section className="photo-intake panel" aria-labelledby="photo-intake-title">
      <div className="photo-intake-heading"><div><p className="eyebrow">Photo studio</p><h1 id="photo-intake-title">Bring the look into focus.</h1><p className="lede">Add a photo of yourself and the product you are considering. Your source images stay in this session until you choose what to save.</p></div><span className="photo-step">01 / 02</span></div>
      <div className="upload-grid">
        <div className="upload-block"><div className="upload-label"><span>01</span><h2>Your photo</h2><p>One clear person, face visible</p></div><label className={`dropzone ${personalPhoto === null ? '' : 'has-file'}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, 'personal')} htmlFor="personal-photo"><input id="personal-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onChange(event, 'personal')} />{personalPhoto === null ? <><strong>Drop your photo here</strong><span>or browse from your device</span><small>JPG, PNG, WebP · max 5 MB</small></> : <><img src={personalPhoto.url} alt="Selected personal photo" /><span className="replace-label">Replace photo</span></>}</label><p className="upload-note">Use a well-lit, front-facing image with one person. We reject images where a face cannot be detected.</p></div>
        <div className="upload-block"><div className="upload-label"><span>02</span><h2>Product photos</h2><p>{productPhotos.length} / {maxProductPhotos} added · use multiple angles</p></div><label className="dropzone product-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, 'product')} htmlFor="product-photos"><input id="product-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => onChange(event, 'product')} /><strong>Add product photos</strong><span>Front, back, detail, or size label</span><small>Up to {maxProductPhotos} images · max 5 MB each</small></label>{productPhotos.length > 0 ? <div className="photo-strip" aria-label="Selected product photos">{productPhotos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={`Selected product photo ${photo.file.name}`} /><button type="button" aria-label={`Remove ${photo.file.name}`} onClick={() => { URL.revokeObjectURL(photo.url); setProductPhotos((current) => current.filter((item) => item.id !== photo.id)); }}>×</button></figure>)}</div> : null}<p className="upload-note">Multiple images help identify the garment, colour, texture, and construction more reliably.</p></div>
      </div>
      {message ? <p className="upload-message" role="status">{message}</p> : null}
      <div className="upload-footer"><span>Images are checked before generation.</span><button type="button" disabled={personalPhoto === null || productPhotos.length === 0}>Review photo set <span aria-hidden="true">→</span></button></div>
    </section>
  );
};
