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
