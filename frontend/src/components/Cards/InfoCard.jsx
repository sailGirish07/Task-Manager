import React from "react";

export default function InfoCard({icon, label, value, color}){
    return (
        <div className="flex items-center gap-3">
            <div className={`w-2 md:w-2 h-3 md:h-5 ${color} rounded-full`}/>
                <p className="text-xs md:text-[14px] text-gray-500 whitespace-nowrap">
                    <span className="text-sm md:text-[15px] text-black font-semibold mr-1">{value}</span>{label}
                </p>
            {/* </div> */}
        </div>
    )
}