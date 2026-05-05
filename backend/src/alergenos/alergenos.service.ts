import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type CatalogoAlergeno = {
  nombre: string;
  icono: string;
  colorBg: string;
  colorTexto: string;
};

type QueryRunner = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

const DEFAULT_ALERGENOS: CatalogoAlergeno[] = [
  { nombre: 'Lácteos', icono: 'fa-solid fa-cow', colorBg: '#e3f2fd', colorTexto: '#1976d2' },
  { nombre: 'Gluten', icono: 'fa-solid fa-wheat-awn', colorBg: '#fff8e1', colorTexto: '#f57c00' },
  { nombre: 'Huevos', icono: 'fa-solid fa-egg', colorBg: '#fffde7', colorTexto: '#f9a825' },
  { nombre: 'Pescado', icono: 'fa-solid fa-fish', colorBg: '#e1f5fe', colorTexto: '#0277bd' },
  { nombre: 'Crustáceos', icono: 'fa-solid fa-shrimp', colorBg: '#fce4ec', colorTexto: '#c2185b' },
  { nombre: 'Moluscos', icono: 'fa-solid fa-circle', colorBg: '#f3e5f5', colorTexto: '#7b1fa2' },
  { nombre: 'Almendras', icono: 'fa-solid fa-seedling', colorBg: '#efebe9', colorTexto: '#5d4037' },
  { nombre: 'Avellanas', icono: 'fa-solid fa-circle-dot', colorBg: '#efebe9', colorTexto: '#5d4037' },
  { nombre: 'Nueces', icono: 'fa-solid fa-brain', colorBg: '#efebe9', colorTexto: '#5d4037' },
  { nombre: 'Anacardos', icono: 'fa-solid fa-seedling', colorBg: '#efebe9', colorTexto: '#5d4037' },
  { nombre: 'Pistachos', icono: 'fa-solid fa-seedling', colorBg: '#f1f8e9', colorTexto: '#33691e' },
  { nombre: 'Pacanas', icono: 'fa-solid fa-circle-dot', colorBg: '#efebe9', colorTexto: '#4e342e' },
  { nombre: 'Nueces de Brasil', icono: 'fa-solid fa-seedling', colorBg: '#efebe9', colorTexto: '#3e2723' },
  { nombre: 'Macadamias', icono: 'fa-solid fa-circle-dot', colorBg: '#fff8e1', colorTexto: '#f57f17' },
  { nombre: 'Soja', icono: 'fa-solid fa-leaf', colorBg: '#f1f8e9', colorTexto: '#558b2f' },
  { nombre: 'Sulfitos', icono: 'fa-solid fa-wine-bottle', colorBg: '#f3e5f5', colorTexto: '#8e24aa' },
  { nombre: 'Apio', icono: 'fa-solid fa-carrot', colorBg: '#e8f5e9', colorTexto: '#2e7d32' },
  { nombre: 'Mostaza', icono: 'fa-solid fa-pepper-hot', colorBg: '#fff9c4', colorTexto: '#f9a825' },
  { nombre: 'Sésamo', icono: 'fa-solid fa-circle-dot', colorBg: '#ffe0b2', colorTexto: '#e65100' },
  { nombre: 'Cacahuetes', icono: 'fa-solid fa-seedling', colorBg: '#d7ccc8', colorTexto: '#5d4037' },
  { nombre: 'Altramuces', icono: 'fa-solid fa-seedling', colorBg: '#fff9c4', colorTexto: '#fbc02d' },
];

@Injectable()
export class AlergenosService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    await this.ensureCatalog(this.db as unknown as QueryRunner);
    const { rows } = await this.db.query(
      `SELECT id, nombre, icono, color_bg as "colorBg", color_texto as "colorTexto"
       FROM alergenos
       ORDER BY nombre ASC`,
    );
    return rows;
  }

  async findUserAlergias(userId: string) {
    await this.ensureCatalog(this.db as unknown as QueryRunner);
    const { rows } = await this.db.query<{ nombre: string }>(
      `SELECT a.nombre
       FROM usuario_alergenos ua
       INNER JOIN alergenos a ON a.id = ua.alergeno_id
       WHERE ua.usuario_id = $1
       ORDER BY a.nombre ASC`,
      [userId],
    );
    return rows.map((row) => row.nombre);
  }

  async saveUserAlergias(userId: string, alergias: string[]) {
    const nombres = [...new Set(alergias.map((item) => String(item).trim()).filter(Boolean))];

    await this.db.transaction(async (client) => {
      await this.ensureCatalog(client as unknown as QueryRunner);
      await client.query('DELETE FROM usuario_alergenos WHERE usuario_id = $1', [userId]);

      if (nombres.length === 0) {
        return;
      }

      const result = await client.query(
        'SELECT id FROM alergenos WHERE nombre = ANY($1::varchar[])',
        [nombres],
      );

      for (const row of result.rows) {
        await client.query(
          `INSERT INTO usuario_alergenos (usuario_id, alergeno_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [userId, row.id],
        );
      }
    });

    return {
      message: 'Alergias actualizadas',
      alergias: nombres,
    };
  }

  private async ensureCatalog(runner: QueryRunner) {
    for (const item of DEFAULT_ALERGENOS) {
      await runner.query(
        `INSERT INTO alergenos (nombre, icono, color_bg, color_texto)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (nombre)
         DO UPDATE SET icono = EXCLUDED.icono, color_bg = EXCLUDED.color_bg, color_texto = EXCLUDED.color_texto`,
        [item.nombre, item.icono, item.colorBg, item.colorTexto],
      );
    }
  }
}