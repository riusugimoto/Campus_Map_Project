import React, { useState, useEffect } from 'react';
import {
	Box,
	Chip,
	IconButton,
	Typography,
	Slider,
	Collapse,
	Fade,
	Zoom
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ChairIcon from '@mui/icons-material/Chair';
import CategoryIcon from '@mui/icons-material/Category';
import { Room } from '../../types/rooms';
import { ChairRounded, People } from "@mui/icons-material";
import ApartmentIcon from "@mui/icons-material/Apartment";

interface RoomFilterProps {
	rooms: Room[];
	onFilterChange: (filters: {
		type: string[];
		furniture: string[];
		minSeats: number;
		maxSeats: number;
	}) => void;
	metadata: {
		types: string[];
		furniture: string[];
		maxCapacity: number;
	};
	currentFilters: {
		type: string[];
		furniture: string[];
		minSeats: number;
		maxSeats: number;
	};
}

const RoomFilter: React.FC<RoomFilterProps> = ({
												   rooms,
												   onFilterChange,
												   metadata,
												   currentFilters
											   }) => {
	const [showFilters, setShowFilters] = useState(false);
	const [localFilters, setLocalFilters] = useState({
		types: new Set(currentFilters.type),
		furniture: new Set(currentFilters.furniture),
		capacityRange: [
			currentFilters.minSeats,
			currentFilters.maxSeats === Infinity ? metadata.maxCapacity : currentFilters.maxSeats
		] as [number, number]
	});

	// Update local state when currentFilters change from parent
	useEffect(() => {
		setLocalFilters({
			types: new Set(currentFilters.type),
			furniture: new Set(currentFilters.furniture),
			capacityRange: [
				currentFilters.minSeats,
				currentFilters.maxSeats === Infinity ? metadata.maxCapacity : currentFilters.maxSeats
			]
		});
	}, [currentFilters, metadata.maxCapacity]);

	const notifyFilterChange = (newFilters: typeof localFilters) => {
		onFilterChange({
			type: Array.from(newFilters.types),
			furniture: Array.from(newFilters.furniture),
			minSeats: newFilters.capacityRange[0],
			maxSeats: newFilters.capacityRange[1]
		});
	};

	const handleTypeToggle = (type: string) => {
		const newTypes = new Set(localFilters.types);
		if (newTypes.has(type)) {
			newTypes.delete(type);
		} else {
			newTypes.add(type);
		}
		const newFilters = { ...localFilters, types: newTypes };
		setLocalFilters(newFilters);
		notifyFilterChange(newFilters);
	};

	const handleFurnitureToggle = (furniture: string) => {
		const newFurniture = new Set(localFilters.furniture);
		if (newFurniture.has(furniture)) {
			newFurniture.delete(furniture);
		} else {
			newFurniture.add(furniture);
		}
		const newFilters = { ...localFilters, furniture: newFurniture };
		setLocalFilters(newFilters);
		notifyFilterChange(newFilters);
	};

	const handleCapacityChange = (_: Event, value: number | number[]) => {
		const newRange = value as [number, number];
		setLocalFilters(prev => ({ ...prev, capacityRange: newRange }));
	};

	const handleCapacityChangeCommitted = (_: Event | null, value: number | number[]) => {
		const newRange = value as [number, number];
		const newFilters = { ...localFilters, capacityRange: newRange };
		setLocalFilters(newFilters);
		notifyFilterChange(newFilters);
	};

	const clearFilters = () => {
		const newFilters = {
			types: new Set<string>(),
			furniture: new Set<string>(),
			capacityRange: [0, metadata.maxCapacity] as [number, number]
		};
		setLocalFilters(newFilters);
		notifyFilterChange(newFilters);
	};

	const hasActiveFilters =
		localFilters.types.size > 0 ||
		localFilters.furniture.size > 0 ||
		localFilters.capacityRange[0] > 0 ||
		localFilters.capacityRange[1] < metadata.maxCapacity;

	return (
		<Box sx={{ width: '100%' }}>
			{/* Filter Header */}
			<Box sx={{
				mb: 2,
				display: 'flex',
				flexDirection: 'column',
				gap: 2
			}}>
				{/* Filter Toggle and Clear */}
				<Box sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between'
				}}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						<IconButton
							onClick={() => setShowFilters(!showFilters)}
							sx={{
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
								backdropFilter: 'blur(10px)',
								transition: 'all 0.2s',
								'&:hover': {
									backgroundColor: 'rgba(255, 255, 255, 0.2)',
									transform: 'scale(1.05)'
								}
							}}
						>
							<FilterListIcon />
						</IconButton>
						<Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
							Filter Rooms
						</Typography>
					</Box>

					{hasActiveFilters && (
						<Fade in>
							<IconButton
								onClick={clearFilters}
								size="small"
								sx={{
									backgroundColor: 'rgba(255, 59, 59, 0.1)',
									backdropFilter: 'blur(10px)',
									'&:hover': {
										backgroundColor: 'rgba(255, 59, 59, 0.2)',
									}
								}}
							>
								<CloseIcon />
							</IconButton>
						</Fade>
					)}
				</Box>

				{/* Active Filters */}
				{hasActiveFilters && (
					<Box sx={{
						display: 'flex',
						gap: 1,
						flexWrap: 'wrap',
						p: 2,
						borderRadius: 2,
						backgroundColor: 'rgba(255, 255, 255, 0.05)',
						backdropFilter: 'blur(10px)'
					}}>
						{Array.from(localFilters.types).map(type => (
							<Zoom in key={`type-${type}`}>
								<Chip
									icon={<CategoryIcon />}
									label={`Type: ${type}`}
									onDelete={() => handleTypeToggle(type)}
									sx={{
										backgroundColor: 'rgba(144, 202, 249, 0.2)',
										backdropFilter: 'blur(10px)',
										color: 'white',
										'& .MuiChip-deleteIcon': {
											color: 'rgba(255, 255, 255, 0.7)',
										},
										'&:hover': {
											backgroundColor: 'rgba(144, 202, 249, 0.3)',
										}
									}}
								/>
							</Zoom>
						))}
						{Array.from(localFilters.furniture).map(furniture => (
							<Zoom in key={`furniture-${furniture}`}>
								<Chip
									icon={<TableRowsIcon />}
									label={`Furniture: ${furniture}`}
									onDelete={() => handleFurnitureToggle(furniture)}
									sx={{
										backgroundColor: 'rgba(129, 199, 132, 0.2)',
										backdropFilter: 'blur(10px)',
										color: 'white',
										'& .MuiChip-deleteIcon': {
											color: 'rgba(255, 255, 255, 0.7)',
										},
										'&:hover': {
											backgroundColor: 'rgba(129, 199, 132, 0.3)',
										}
									}}
								/>
							</Zoom>
						))}
						{(localFilters.capacityRange[0] > 0 || localFilters.capacityRange[1] < metadata.maxCapacity) && (
							<Zoom in>
								<Chip
									icon={<ChairIcon />}
									label={`Capacity: ${localFilters.capacityRange[0]}-${localFilters.capacityRange[1]}`}
									onDelete={() => handleCapacityChangeCommitted(null, [0, metadata.maxCapacity])}
									sx={{
										backgroundColor: 'rgba(255, 167, 38, 0.2)',
										backdropFilter: 'blur(10px)',
										color: 'white',
										'& .MuiChip-deleteIcon': {
											color: 'rgba(255, 255, 255, 0.7)',
										},
										'&:hover': {
											backgroundColor: 'rgba(255, 167, 38, 0.3)',
										}
									}}
								/>
							</Zoom>
						)}
					</Box>
				)}
			</Box>

			{/* Filter Panel */}
			<Collapse in={showFilters}>
				<Box sx={{
					p: 3,
					borderRadius: 2,
					backgroundColor: 'rgba(0, 0, 0, 0.3)',
					backdropFilter: 'blur(10px)',
					display: 'flex',
					flexDirection: 'column',
					mb: 2,
					gap: 4
				}}>
					{/* Room Types */}
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
							<ApartmentIcon />
							<Typography variant="subtitle2" color="primary" fontWeight="medium">
								Room Type {localFilters.types.size > 0 && `(${localFilters.types.size} selected)`}
							</Typography>
						</Box>
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
							{metadata.types.map(type => (
								<Chip
									key={type}
									label={type}
									onClick={() => handleTypeToggle(type)}
									sx={{
										backgroundColor: localFilters.types.has(type)
											? 'rgba(144, 202, 249, 0.2)'
											: 'rgba(255, 255, 255, 0.05)',
										backdropFilter: 'blur(10px)',
										transition: 'all 0.2s',
										'&:hover': {
											transform: 'translateY(-1px)',
											backgroundColor: localFilters.types.has(type)
												? 'rgba(144, 202, 249, 0.3)'
												: 'rgba(255, 255, 255, 0.1)',
										}
									}}
								/>
							))}
						</Box>
					</Box>

					{/* Furniture Types */}
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
							<ChairRounded />
							<Typography variant="subtitle2" color="primary" fontWeight="medium">
								Furniture Type {localFilters.furniture.size > 0 && `(${localFilters.furniture.size} selected)`}
							</Typography>
						</Box>
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
							{metadata.furniture.map(furniture => (
								<Chip
									key={furniture}
									label={furniture}
									onClick={() => handleFurnitureToggle(furniture)}
									sx={{
										backgroundColor: localFilters.furniture.has(furniture)
											? 'rgba(129, 199, 132, 0.2)'
											: 'rgba(255, 255, 255, 0.05)',
										backdropFilter: 'blur(10px)',
										transition: 'all 0.2s',
										'&:hover': {
											transform: 'translateY(-1px)',
											backgroundColor: localFilters.furniture.has(furniture)
												? 'rgba(129, 199, 132, 0.3)'
												: 'rgba(255, 255, 255, 0.1)',
										}
									}}
								/>
							))}
						</Box>
					</Box>

					{/* Capacity Range */}
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
							<People />
							<Typography variant="subtitle2" color="primary" fontWeight="medium">
								Seating Capacity: {localFilters.capacityRange[0]} - {localFilters.capacityRange[1]}
							</Typography>
						</Box>
						<Slider
							value={localFilters.capacityRange}
							onChange={handleCapacityChange}
							onChangeCommitted={handleCapacityChangeCommitted}
							min={0}
							max={metadata.maxCapacity}
							valueLabelDisplay="auto"
							sx={{
								'& .MuiSlider-thumb': {
									backgroundColor: 'rgba(255, 167, 38, 0.9)',
								},
								'& .MuiSlider-track': {
									backgroundColor: 'rgba(255, 167, 38, 0.5)',
								},
								'& .MuiSlider-rail': {
									backgroundColor: 'rgba(255, 255, 255, 0.2)',
								}
							}}
						/>
					</Box>
				</Box>
			</Collapse>
		</Box>
	);
};

export default RoomFilter;
