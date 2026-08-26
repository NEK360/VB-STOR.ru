import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type GalleryItem = {
  type: "image" | "video";
  src: string;
};

type Props = {
  gallery: GalleryItem[];
  productName: string;
};

export default function ProductGallery({
  gallery,
  productName,
}: Props) {

  const [activePhoto, setActivePhoto] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const length = gallery.length;

  const prev = useCallback(() => {
    setActivePhoto((p) =>
      p === 0 ? length - 1 : p - 1
    );
  }, [length]);

  const next = useCallback(() => {
    setActivePhoto((p) =>
      p === length - 1 ? 0 : p + 1
    );
  }, [length]);

  if (!gallery.length) {
    return (
      <div className="aspect-square rounded-3xl bg-white/5 flex items-center justify-center text-7xl">
        📦
      </div>
    );
  }

  const current = gallery[activePhoto];

  return (
    <>
      <div
        className="
        relative
        aspect-square
        overflow-hidden
        rounded-3xl
        "
        onTouchStart={(e)=>{
          setTouchStart(
            e.touches[0].clientX
          );
        }}
        onTouchEnd={(e)=>{

          if(touchStart === null) return;

          const diff =
          e.changedTouches[0].clientX -
          touchStart;

          if(diff > 50) prev();
          if(diff < -50) next();

          setTouchStart(null);
        }}
      >

        <AnimatePresence mode="wait">

          <motion.div
            key={current.src}
            initial={{
              opacity:0,
              scale:1.03
            }}
            animate={{
              opacity:1,
              scale:1
            }}
            exit={{
              opacity:0
            }}
            transition={{
              duration:.25
            }}
            className="w-full h-full"
          >

            {current.type === "video" ? (

              <video
                src={current.src}
                controls
                className="
                w-full
                h-full
                object-cover
                "
              />

            ) : (

              <img
                src={current.src}
                alt={productName}
                onClick={()=>setZoom(true)}
                className="
                w-full
                h-full
                object-cover
                cursor-pointer
                "
              />

            )}

          </motion.div>

        </AnimatePresence>

        {length > 1 && (

          <>
            <button
              onClick={prev}
              className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              w-10
              h-10
              rounded-full
              bg-black/40
              text-white
              flex
              items-center
              justify-center
              "
            >
              <ChevronLeft size={22}/>
            </button>

            <button
              onClick={next}
              className="
              absolute
              right-4
              top-1/2
              -translate-y-1/2
              w-10
              h-10
              rounded-full
              bg-black/40
              text-white
              flex
              items-center
              justify-center
              "
            >
              <ChevronRight size={22}/>
            </button>
          </>

        )}

      </div>

      {length > 1 && (

        <div className="flex gap-3 overflow-x-auto pt-3">

          {gallery.map((item,index)=>(

            <button
              key={item.src}
              onClick={()=>setActivePhoto(index)}
              className={`
              w-16
              h-16
              rounded-xl
              overflow-hidden
              border-2
              shrink-0
              ${
                index===activePhoto
                ?
                "border-white"
                :
                "border-white/10"
              }
              `}
            >

              {item.type==="video" ? (

                <div className="
                w-full
                h-full
                bg-black/50
                flex
                items-center
                justify-center
                text-white
                ">
                  ▶
                </div>

              ):(

                <img
                  src={item.src}
                  className="w-full h-full object-cover"
                />

              )}

            </button>

          ))}

        </div>

      )}

      {zoom && (

        <div
          onClick={()=>setZoom(false)}
          className="
          fixed
          inset-0
          z-[500]
          bg-black/95
          flex
          items-center
          justify-center
          p-5
          "
        >

          <img
            src={current.src}
            className="
            max-w-full
            max-h-full
            object-contain
            rounded-2xl
            "
          />

        </div>

      )}

    </>
  );
}
                >
              ‹
            </button>

            <button
              onClick={nextPhoto}
              className="
              absolute
              right-4
              top-1/2
              -translate-y-1/2
              w-10
              h-10
              rounded-full
              bg-black/40
              text-white
              backdrop-blur
              "
            >
              ›
            </button>
          </>
        )}

      </div>

      {/* Миниатюры */}
      {gallery.length > 1 && (

        <div
          className="
          flex
          gap-3
          overflow-x-auto
          scrollbar-none
          pb-2
          "
        >

          {gallery.map((item,index)=>(

            <button
              key={item.src}
              onClick={() =>
                setActivePhoto(index)
              }
              className={`
              shrink-0
              w-16
              h-16
              rounded-xl
              overflow-hidden
              border-2
              transition-all

              ${
                activePhoto === index
                ?
                "border-white ring-2 ring-white/40"
                :
                "border-white/10"
              }

              `}
            >

              {
                item.type === "video"
                ?

                <div className="
                w-full
                h-full
                flex
                items-center
                justify-center
                bg-black
                text-white
                ">
                  ▶
                </div>

                :

                <img
                  src={item.src}
                  alt=""
                  className="
                  w-full
                  h-full
                  object-cover
                  "
                />

              }

            </button>

          ))}

        </div>

      )}

    </div>
  );
}
