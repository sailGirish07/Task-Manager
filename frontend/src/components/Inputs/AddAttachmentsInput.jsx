import React, { useState } from "react";
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import { LuPaperclip } from "react-icons/lu";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

export default function AddAttachmentsInput({ attachments, setAttachments }) {
  const [option, setOption] = useState("");
  const [uploading, setUploading] = useState(false);

  //Function to handle adding an option (either URL or file upload)
  const handleAddOption = async () => {
    // If there's text in the input, treat it as a URL
    if (option.trim()) {
      setAttachments([...attachments, option.trim()]);
      setOption("");
      return;
    }

    // If no text, trigger file upload
    document.getElementById("file-input").click();
  };

  //Function to handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("attachment", file);

    try {
      const response = await axiosInstance.post(
        API_PATHS.TASKS.UPLOAD_ATTACHMENT,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.fileUrl) {
        setAttachments([...attachments, response.data.fileUrl]);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  //Function to handle deleting an option
  const handleDeleteOption = (index) => {
    const updatedArr = attachments.filter((_, idx) => idx != index);
    setAttachments(updatedArr);
  };

  return (
    <div>
      {attachments.map((item, index) => (
        <div
          key={item}
          className="flex justify-between bg-gray-50 border-gray-100 px-3 py-2 rounded-md mb-2 mt-2"
        >
          <div className="flex-1 flex items-center gap-3 border border-gray-100">
            <LuPaperclip className="text-gray-400" />
            <p className="text-xs text-black">{item}</p>
          </div>

          <button
            className="cursor-pointer"
            onClick={() => {
              handleDeleteOption(index);
            }}
          >
            <HiOutlineTrash className="text-lg text-red-500" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3 mt-4">
        <div className="flex-1 flex items-center gap-3 border border-gray-100 rounded-md px-3">
          <LuPaperclip className="text-gray-400" />

          <input
            type="text"
            placeholder="Add File Link or Upload File"
            value={option}
            onChange={(e) => setOption(e.target.value)}
            className="w-full text-[13px] text-black outline-none bg-white py-2 "
          />
        </div>

        <button
          className="card-btn text-nowrap"
          onClick={handleAddOption}
          disabled={uploading}
        >
          <HiMiniPlus className="text-lg" />
          {uploading ? "Uploading..." : "Add"}
        </button>
      </div>

      <input
        id="file-input"
        type="file"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
