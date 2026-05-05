import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { SaveEscandalloDto } from './dto/save-escandallo.dto';

@Injectable()
export class EscandallosService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const { rows } = await this.db.query<{
      id: number;
      nombre: string;
      autor: string | null;
      coste: number | string;
      pvp: number | string;
      elaboracion: string | null;
    }>(
      `SELECT id, nombre, autor, coste, pvp, elaboracion
       FROM escandallos
       ORDER BY fecha_actualizacion DESC, nombre ASC`,
    );

    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const itemsResult = await this.db.query<{
      escandalloId: number;
      producto_id: string;
      nombre: string;
      cantidad: number | string;
      precio: number | string;
    }>(
      `SELECT escandallo_id as "escandalloId", producto_id, nombre, cantidad, precio
       FROM escandallo_items
       WHERE escandallo_id = ANY($1::int[])
       ORDER BY id ASC`,
      [ids],
    );

    const itemsByEscandallo = new Map<number, Array<Record<string, unknown>>>();
    itemsResult.rows.forEach((item) => {
      const current = itemsByEscandallo.get(item.escandalloId) ?? [];
      current.push({
        producto_id: item.producto_id,
        nombre: item.nombre,
        cantidad: Number(item.cantidad),
        precio: Number(item.precio),
      });
      itemsByEscandallo.set(item.escandalloId, current);
    });

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      autor: row.autor ?? 'Admin',
      coste: Number(row.coste),
      pvp: Number(row.pvp),
      elaboracion: row.elaboracion ?? '',
      items: itemsByEscandallo.get(row.id) ?? [],
    }));
  }

  async create(dto: SaveEscandalloDto, userId: string) {
    const coste = this.calcularCoste(dto.items);

    const result = await this.db.transaction(async (client) => {
      const insert = await client.query(
        `INSERT INTO escandallos (nombre, autor, coste, pvp, elaboracion, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [dto.nombre.trim(), dto.autor ?? 'Admin', coste, dto.pvp, dto.elaboracion ?? '', userId || null],
      );

      const escandalloId = Number(insert.rows[0]?.id);
      await this.insertItems(client, escandalloId, dto);
      return escandalloId;
    });

    return this.findById(result);
  }

  async update(id: number, dto: SaveEscandalloDto, userId: string) {
    const coste = this.calcularCoste(dto.items);

    await this.ensureExists(id);
    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE escandallos
         SET nombre = $1,
             autor = $2,
             coste = $3,
             pvp = $4,
             elaboracion = $5,
             usuario_id = $6,
             fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [dto.nombre.trim(), dto.autor ?? 'Admin', coste, dto.pvp, dto.elaboracion ?? '', userId || null, id],
      );

      await client.query('DELETE FROM escandallo_items WHERE escandallo_id = $1', [id]);
      await this.insertItems(client, id, dto);
    });

    return this.findById(id);
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.db.query('DELETE FROM escandallos WHERE id = $1', [id]);
    return { message: 'Escandallo eliminado' };
  }

  private async findById(id: number) {
    const all = await this.findAll();
    const escandallo = all.find((item) => item.id === id);
    if (!escandallo) {
      throw new NotFoundException('Escandallo no encontrado');
    }
    return escandallo;
  }

  private async ensureExists(id: number) {
    const { rows } = await this.db.query('SELECT id FROM escandallos WHERE id = $1 LIMIT 1', [id]);
    if (rows.length === 0) {
      throw new NotFoundException('Escandallo no encontrado');
    }
  }

  private calcularCoste(items: SaveEscandalloDto['items']) {
    return items.reduce((total, item) => total + Number(item.cantidad) * Number(item.precio), 0);
  }

  private async insertItems(
    client: { query: (text: string, params?: unknown[]) => Promise<unknown> },
    escandalloId: number,
    dto: SaveEscandalloDto,
  ) {
    for (const item of dto.items) {
      await client.query(
        `INSERT INTO escandallo_items (escandallo_id, producto_id, nombre, cantidad, precio)
         VALUES ($1, $2, $3, $4, $5)`,
        [escandalloId, String(item.producto_id), item.nombre.trim(), Number(item.cantidad), Number(item.precio)],
      );
    }
  }
}