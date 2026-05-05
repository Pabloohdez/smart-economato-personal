import { Body, Controller, Get, Post } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateCategoriaDto } from './create-categoria.dto';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Public()
  @Get()
  async listar() {
    return this.categoriasService.findAll();
  }

  @Roles('admin')
  @Post()
  async crear(@Body() body: CreateCategoriaDto) {
    return this.categoriasService.crear((body as any).nombre, (body as any).descripcion);
  }
}
