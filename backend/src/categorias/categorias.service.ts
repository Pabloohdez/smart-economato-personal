import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CategoriasService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM categorias ORDER BY nombre ASC');
    return rows;
  }

  async crear(nombre: string, descripcion?: string) {
    await this.db.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2)',
      [nombre, descripcion ?? null],
    );
    return { message: 'Categoría creada' };
  }
}
