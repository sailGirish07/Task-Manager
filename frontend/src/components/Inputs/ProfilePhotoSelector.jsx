
import React, { useState, useRef, useEffect } from "react";
import { LuUser, LuUpload, LuTrash } from "react-icons/lu";

export default function ProfilePhotoSelector({ image, setImage }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Handle image selection
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImage(file);

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  // Remove image
  const handleRemoveImage = () => {
    setImage(null);
    setPreviewUrl(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // Trigger file input
  const onChooseFile = () => {
    inputRef.current?.click();
  };

  // Cleanup object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="flex justify-center mb-6">
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        onChange={handleImageChange}
        className="hidden"
      />

      {/* No image selected */}
      {!image ? (
        <div className="relative w-20 h-20 flex items-center justify-center bg-blue-100/50 rounded-full">
          <LuUser className="text-4xl text-primary" />

          <button
            type="button"
            aria-label="Upload profile photo"
            onClick={onChooseFile}
            className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full absolute -bottom-1 -right-1 hover:scale-105 transition"
          >
            <LuUpload />
          </button>
        </div>
      ) : (
        /* Image selected */
        <div className="relative group w-20 h-20 cursor-pointer">
          <img
            src={previewUrl}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Delete button */}
          <button
            type="button"
            aria-label="Remove profile photo"
            onClick={handleRemoveImage}
            className="
              w-6 h-6
              flex items-center justify-center
              bg-red-500 text-white
              rounded-full
              absolute top-1 right-1
              opacity-0
              group-hover:opacity-100
              transition-opacity duration-200
              shadow-lg border border-white
              z-10
            "
          >
            <LuTrash size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
