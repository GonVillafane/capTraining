const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  const { Movies, Customers, Rentals } = this.entities;

  // Acción para alquilar una película
  this.on('rentMovie', async (req) => {
    const { movieId, customerId, quantity } = req.data;
    
    try {
      // Verificar que la película existe
      const movie = await SELECT.one.from(Movies).where({ ID: movieId });
      if (!movie) {
        req.error(404, 'Película no encontrada');
        return;
      }

      // Verificar que el cliente existe
      const customer = await SELECT.one.from(Customers).where({ ID: customerId });
      if (!customer) {
        req.error(404, 'Cliente no encontrado');
        return;
      }

      // Verificar que el cliente no tenga ya un alquiler activo de esta película
      const existingRental = await SELECT.one.from(Rentals).where({ 
        customer_ID: customerId, 
        movie_ID: movieId,
        status: 'ACTIVE'
      });
      
      if (existingRental) {
        req.error(400, `El cliente "${customer.name}" ya tiene un alquiler activo de "${movie.title}". Debe devolverlo antes de alquilar nuevamente o incrementar la cantidad del alquiler existente.`);
        return;
      }

      // Verificar stock disponible
      if (movie.stock < quantity) {
        req.error(400, `Stock insuficiente. Disponible: ${movie.stock}, Solicitado: ${quantity}`);
        return;
      }

      // Crear el alquiler
      const rental = {
        customer_ID: customerId,
        movie_ID: movieId,
        quantity: quantity,
        rentalDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        totalPrice: movie.price * quantity
      };

      const result = await INSERT.into(Rentals).entries(rental);

      // Actualizar stock y contador de alquileres
      await UPDATE(Movies)
        .set({
          stock: movie.stock - quantity,
          rentedCount: movie.rentedCount + quantity
        })
        .where({ ID: movieId });

      return `Alquiler registrado exitosamente. ID: ${result.lastInsertRowid || 'generado'}`;

    } catch (error) {
      console.error('Error en rentMovie:', error);
      req.error(500, 'Error interno del servidor');
    }
  });

  // Acción para devolver una película
  this.on('returnRental', async (req) => {
    const { rentalId } = req.data;
    
    try {
      // Buscar el alquiler
      const rental = await SELECT.one
        .from(Rentals, r => {
          r.ID, r.quantity, r.status,
          r.movie(m => { m.ID, m.stock })
        })
        .where({ ID: rentalId });

      if (!rental) {
        req.error(404, 'Alquiler no encontrado');
        return;
      }

      if (rental.status === 'RETURNED') {
        req.error(400, 'Este alquiler ya fue devuelto');
        return;
      }

      // Marcar como devuelto
      await UPDATE(Rentals)
        .set({
          status: 'RETURNED',
          returnDate: new Date().toISOString().split('T')[0]
        })
        .where({ ID: rentalId });

      // Reponer stock
      await UPDATE(Movies)
        .set({
          stock: rental.movie.stock + rental.quantity
        })
        .where({ ID: rental.movie.ID });

      return 'Película devuelta exitosamente';

    } catch (error) {
      console.error('Error en returnRental:', error);
      req.error(500, 'Error interno del servidor');
    }
  });

  // Acción para incrementar cantidad de un alquiler existente
  this.on('increaseRental', async (req) => {
    const { rentalId, additionalQuantity } = req.data;
    
    try {
      // Buscar el alquiler activo
      const rental = await SELECT.one
        .from(Rentals, r => {
          r.ID, r.quantity, r.status, r.movie_ID, r.totalPrice,
          r.movie(m => { m.ID, m.stock, m.title, m.price })
        })
        .where({ ID: rentalId });

      if (!rental) {
        req.error(404, 'Alquiler no encontrado');
        return;
      }

      if (rental.status !== 'ACTIVE') {
        req.error(400, 'Solo se puede incrementar alquileres activos');
        return;
      }

      // Verificar stock disponible
      if (rental.movie.stock < additionalQuantity) {
        req.error(400, `Stock insuficiente. Disponible: ${rental.movie.stock}, Solicitado: ${additionalQuantity}`);
        return;
      }

      // Actualizar alquiler
      await UPDATE(Rentals)
        .set({ 
          quantity: rental.quantity + additionalQuantity,
          totalPrice: rental.totalPrice + (additionalQuantity * rental.movie.price)
        })
        .where({ ID: rentalId });

      // Actualizar stock
      await UPDATE(Movies)
        .set({
          stock: rental.movie.stock - additionalQuantity,
          rentedCount: rental.movie.rentedCount + additionalQuantity
        })
        .where({ ID: rental.movie_ID });

      return `Alquiler incrementado exitosamente. Nueva cantidad: ${rental.quantity + additionalQuantity}`;

    } catch (error) {
      console.error('Error en increaseRental:', error);
      req.error(500, 'Error interno del servidor');
    }
  });

  // Función para obtener estadísticas
  this.on('getMovieStats', async (req) => {
    try {
      const stats = await SELECT`
        title as movieTitle,
        rentedCount as totalRented,
        stock as currentStock
      `.from(Movies).orderBy('rentedCount desc');

      return stats;
    } catch (error) {
      console.error('Error en getMovieStats:', error);
      req.error(500, 'Error interno del servidor');
    }
  });

  // Event handler antes de crear un alquiler (validación adicional)
  this.before('CREATE', 'Rentals', async (req) => {
    const { movie_ID, quantity } = req.data;
    
    if (quantity <= 0) {
      req.error(400, 'La cantidad debe ser mayor a 0');
    }

    if (movie_ID) {
      const movie = await SELECT.one.from(Movies).where({ ID: movie_ID });
      if (movie && movie.stock < quantity) {
        req.error(400, `Stock insuficiente para la película ${movie.title}`);
      }
    }
  });

  // Event handler después de leer películas (para calcular disponibilidad)
  this.after('READ', 'Movies', (movies) => {
    if (Array.isArray(movies)) {
      movies.forEach(movie => {
        movie.available = movie.stock > 0;
      });
    } else if (movies) {
      movies.available = movies.stock > 0;
    }
  });
});