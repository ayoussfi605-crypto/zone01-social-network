/* eslint-disable @next/next/no-img-element */

import { FaceSlightlySmilingIcon, Send } from "lucide-react";

export default function DiscussionWindow({ UserData }: any) {
  console.log("UserData:", UserData);

  return (
    <div className="flex flex-col flex-1">
      <div className="navebare flex items-center justify-start p-3.5 border-b border-slate-200/60 max-h-17.25">
        <div className="image">
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={UserData?.avatar}
            alt={UserData?.fullName || "User avatar"}
          />
        </div>

        <div className="info ml-3">
          <h3 className="text-[15px] font-bold">{UserData?.fullName}</h3>

          {UserData?.online ? (
            <div className="flex items-center gap-2">
              <span className="block h-2 w-2 rounded-full bg-green-600"></span>
              <p>online</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="block h-2 w-2 rounded-full bg-gray-500"></span>
              <p>offline</p>
            </div>
          )}
        </div>
      </div>
      <div className="chatwindow flex flex-col flex-1 justify-between">
        <div className="flex-1 bg-[#F8FAFC]">messages</div>
        <div className="flex bg-white p-4">
          <div className="bg-[#F8FAFC] p-2.5 flex flex-col gap-1.5 rounded-2xl border border-slate-200/80 shadow-inner w-full">
            <div className="pb-1.5 flex text-[#9CA3AF] justify-start items-center gap-1.5 border-b  border-slate-200/60 ">
              <img
                className="w-9 h-9 placeholder-[#9CA3AF] object-cover rounded-full "
                src={UserData.avatar}
                alt="heloo"
              />
              <input
                className="outline-0 border-0 w-full p-1.5"
                type="text"
                placeholder="message..."
              />
              <FaceSlightlySmilingIcon />
            </div>
            <div className="px-5  max-w-fit ml-auto text-[12px] py-2 bg-[#1A1A1A] hover:bg-black disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-black/10 transition scale-100 active:scale-95 shrink-0">
              <button>Send</button>
              <Send size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
    
    
}
