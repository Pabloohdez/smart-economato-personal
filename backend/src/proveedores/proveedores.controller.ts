import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateProveedorDto, UpdateProveedorDto } from './create-proveedor.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('proveedores')
export class ProveedoresController {
  constructor(
    private readonly proveedoresService: ProveedoresService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Public()
  @Get()
  async listar() {
    return this.proveedoresService.findAll();
  }

  @Roles('admin', 'administrador', 'profesor')
  @Post()
  async crear(@Body() body: CreateProveedorDto) {
    const result = await this.proveedoresService.crear(body as any);
    this.realtimeService.publish(['proveedores', 'productos'], 'proveedores');
    return result;
  }

  @Roles('admin', 'administrador', 'profesor')
  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() body: UpdateProveedorDto) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID inválido', HttpStatus.BAD_REQUEST);
    const result = await this.proveedoresService.actualizar(numId, body as any);
    this.realtimeService.publish(['proveedores', 'productos'], 'proveedores');
    return result;
  }

  @Roles('admin', 'administrador', 'profesor')
  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID obligatorio para eliminar', HttpStatus.BAD_REQUEST);
    const result = await this.proveedoresService.eliminar(numId);
    this.realtimeService.publish(['proveedores', 'productos'], 'proveedores');
    return result;
  }
}
