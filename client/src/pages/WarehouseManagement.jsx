import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Modal, TextField, Grid } from '@mui/material';
import { Plus, Edit } from 'lucide-react';
import api from '../api/axios';

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    warehouseName: '', city: '', latitude: '', longitude: '', capacity: '', activeStatus: true
  });
  const [editId, setEditId] = useState(null);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleOpen = (warehouse = null) => {
    if (warehouse) {
      setFormData(warehouse);
      setEditId(warehouse._id);
    } else {
      setFormData({ warehouseName: '', city: '', latitude: '', longitude: '', capacity: '', activeStatus: true });
      setEditId(null);
    }
    setOpenModal(true);
  };

  const handleClose = () => setOpenModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/warehouses/${editId}`, formData);
      } else {
        await api.post('/warehouses', formData);
      }
      fetchWarehouses();
      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="text.primary" fontWeight="bold">
          Warehouse Management
        </Typography>
        <Button variant="contained" color="primary" startIcon={<Plus />} onClick={() => handleOpen()}>
          Add Warehouse
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Warehouse Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {warehouses.map((w) => (
              <TableRow key={w._id}>
                <TableCell>{w.warehouseName}</TableCell>
                <TableCell>{w.city}</TableCell>
                <TableCell>{w.capacity}</TableCell>
                <TableCell>
                  <Chip 
                    label={w.activeStatus ? 'Active' : 'Inactive'} 
                    color={w.activeStatus ? 'success' : 'error'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<Edit size={16} />} onClick={() => handleOpen(w)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal open={openModal} onClose={handleClose}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 500, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: 24, p: 4, borderRadius: 2
        }}>
          <Typography variant="h6" mb={2}>
            {editId ? 'Edit Warehouse' : 'Add Warehouse'}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Warehouse Name" required
                  value={formData.warehouseName} onChange={e => setFormData({...formData, warehouseName: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="City" required
                  value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Latitude" type="number" required inputProps={{ step: "any" }}
                  value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Longitude" type="number" required inputProps={{ step: "any" }}
                  value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Capacity" type="number" required
                  value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">Save</Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default WarehouseManagement;
