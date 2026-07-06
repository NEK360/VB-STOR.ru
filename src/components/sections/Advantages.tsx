import { motion } from "framer-motion";
import { advantages } from "../../store-data/advantages";

export default function Advantages() {
  return (
    <section className="py-20 border-y border-white/6" aria-labelledby="advantages-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Почему VB STORE</p>
          <h2 id="advantages-title" className="text-white font-black text-4xl md:text-5xl tracking-tight">
            Наши преимущества
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass rounded-2xl p-6 border border-white/6 hover:border-white/15 transition-colors duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center text-2xl mb-5">
                {item.icon}
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{item.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
