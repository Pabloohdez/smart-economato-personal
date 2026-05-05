import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { DatabaseModule } from './database/database.module';
import { LoginModule } from './login/login.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { ProductosModule } from './productos/productos.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { BajasModule } from './bajas/bajas.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { InformesModule } from './informes/informes.module';
import { RendimientosModule } from './rendimientos/rendimientos.module';
import { HealthModule } from './health/health.module';
import { AlergenosModule } from './alergenos/alergenos.module';
import { EscandallosModule } from './escandallos/escandallos.module';
import { RealtimeModule } from './realtime/realtime.module';
import { LotesModule } from './lotes/lotes.module';

@Module({
  imports: [
    AuthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    LoginModule,
    UsuariosModule,
    CategoriasModule,
    ProveedoresModule,
    ProductosModule,
    PedidosModule,
    BajasModule,
    MovimientosModule,
    AuditoriaModule,
    InformesModule,
    RendimientosModule,
    AlergenosModule,
    EscandallosModule,
    RealtimeModule,
    LotesModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
