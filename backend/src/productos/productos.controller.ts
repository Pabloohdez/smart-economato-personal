import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateProductoDto } from './create-producto.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('productos')
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Public()
  @Get()
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const l = limit ? parseInt(limit, 10) : undefined;
    return this.productosService.findAll(p, l);
  }

  @Public()
  @Get('stock-bajo-count')
  async getStockBajoCount() {
    return this.productosService.getStockBajoCount();
  }

  @Public()
  @Get('avisos/alerts-count')
  async getAvisosAlertsCount() {
    // Get alerts count (can be combined with avisos module later)
    return this.productosService.getAvisosAlertsCount();
  }

  @Roles('admin')
  @Post()
  async crear(@Body() body: CreateProductoDto) {
    const result = await this.productosService.crear(body as any);
    this.realtimeService.publish(['productos'], 'productos');
    return result;
  }

  @Roles('admin')
  @Post('batch')
  async crearBatch(@Body() body: CreateProductoDto[]) {
    if (!Array.isArray(body) || body.length === 0) {
      throw new HttpException('Se requiere un array de productos', HttpStatus.BAD_REQUEST);
    }
    if (body.length > 100) {
      throw new HttpException('Máximo 100 productos por lote', HttpStatus.BAD_REQUEST);
    }
    const result = await this.productosService.crearBatch(body as any[]);
    this.realtimeService.publish(['productos'], 'productos');
    return result;
  }

  @Roles('admin')
  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() body: CreateProductoDto) {
    if (!id) throw new HttpException('Falta ID', HttpStatus.BAD_REQUEST);
    const result = await this.productosService.actualizar(id, body as any);
    this.realtimeService.publish(['productos'], 'productos');
    return result;
  }
}
