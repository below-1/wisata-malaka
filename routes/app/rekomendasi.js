import { pick, values, sum } from 'lodash-es'
import Multer from 'fastify-multer'
import { Wisata } from '../../models/wisata.model.js'
import { Kriteria } from '../../models/kritsch.model.js'
import { topsis } from '../../serv/topsis.js'

const upload = Multer({ dest: 'uploads/' })

export default async fastify => {
  fastify.get('/', {
    handler: async (request, reply)  => {
      const kriteria_list = await Kriteria.find()
      reply.xview('app/rekomendasi/form', {
        kriteria_list
      })
    }
  })

  fastify.post('/', {
    preHandler: upload.none(),
    handler: async (request, reply) => {
      let payload = {...request.body}
      const kriteria_list = await Kriteria.find()
      console.log( kriteria_list );
      const keys = kriteria_list.map(it => it._id.toString())
      let weights = values(pick(payload, keys)).map(it => parseInt(it))
      const total_weights = sum(weights)
      weights = weights.map(it => it * 1.0 / total_weights)
      const types = kriteria_list.map(k => k.benefit ? 'benefit' : 'cost')
      let filter = {
        jenis: payload.jenis
      }
      // Processing the filter based on jenis
      let items = await Wisata
        .find(filter)
        .populate({
          path: 'kriterias',
          populate: {
            path: 'kriteria',
            model: 'Kriteria'
          }
        })
      items = items.filter(it => it.kriterias.length && it.kriterias.every(kv => kv.value && kv.kriteria));
      if (!items.length) {
        return reply.view('app/rekomendasi/result', {
          error: 'belum ada satupun data kriteria yang diisi!'
        })
      }
      const Xs = items.map(it => {
        it.kriterias.sort((kv_a, kv_b) => {
          const idx_a = kriteria_list.findIndex(k => {
            return k._id.equals( kv_a.kriteria._id )
          });
          const idx_b = kriteria_list.findIndex(k => {
            return k._id.equals( kv_b.kriteria._id )
          });
          return idx_a - idx_b;
        });
        return it.kriterias.map((kv, i) => {
          // console.log( kv )
          const v = kv.value
          const ktype = kv.kriteria.type
          // console.log('ktype = ', ktype)
          if (ktype == 'NUMBER') {
            throw new Error('not_implemented')
          } else if (ktype == 'OPTIONS') {
            const options = kv.kriteria.text_options
            // console.log(' = ', options)
            if (kv.kriteria.multiple) {
              const selected = options
              .filter(opt => v.includes(opt.label))
              .map(opt => opt.value)
              return selected.reduce((a, b) => a + b, 0)
            } else {
              const selected = options.find(opt => opt.label == kv.value)
              if (!selected) {
                throw new Error('KV_INVALID')
              }
              if (kv.kriteria.nama == 'Biaya masuk') {
                console.log('v = ', v)
                console.log('i = ', i)
                console.log(selected)
              }
              return selected.value
            }
          }
        })
      })
      // console.log('Xs')
      // Xs.forEach(row =>  {
      //   console.log(row)
      // })
      console.log(items.map(it => it.nama))
      // throw new Error('stop')

      let result = topsis(Xs, weights, types)
      let selected = result.selected.map(it => {
        return {
          ...it,
          data: items[it.i]
        }
      })
      // console.log(selected)
      // rekomendasi.item = items[rekomendasi.biggest_index]
      reply.view('app/rekomendasi/result', {
        selected
      })
    }
  })
}